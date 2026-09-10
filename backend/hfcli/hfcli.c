#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <time.h>

#include <sql.h>
#include <sqlext.h>

/* Helper de pont iODBC pour le pilote ODBC HFSQL (PCSoft).
 *
 * Le pilote HFSQL sous Linux ne fonctionne qu'avec iODBC ; node-odbc repose sur
 * unixODBC et renvoie une erreur corrompue ("0 U"). Ce petit binaire, compilé
 * contre iODBC dans un stage de build Docker, expose quatre opérations :
 *
 *   hfcli CONNSTR test
 *   hfcli CONNSTR tables
 *   hfcli CONNSTR columns TABLE
 *   hfcli CONNSTR query "SQL" [PARAM...]
 *
 * Chaque opération écrit un objet JSON unique sur stdout :
 *   succès   : {"ok":true, ...}
 *   échec ODBC : {"ok":false,"message":"STATE message texte"} (code de sortie 2)
 */

#ifndef SQL_SUCCEEDED
#define SQL_SUCCEEDED(rc) (((rc) & (~1)) == 0)
#endif

static long long now_ms(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (long long)ts.tv_sec * 1000 + ts.tv_nsec / 1000000;
}

static void emit_string(const unsigned char *s, size_t n)
{
    size_t i;
    fputc('"', stdout);
    for (i = 0; i < n; i++) {
        unsigned char c = s[i];
        switch (c) {
        case '"': fputs("\\\"", stdout); break;
        case '\\': fputs("\\\\", stdout); break;
        case '\b': fputs("\\b", stdout); break;
        case '\f': fputs("\\f", stdout); break;
        case '\n': fputs("\\n", stdout); break;
        case '\r': fputs("\\r", stdout); break;
        case '\t': fputs("\\t", stdout); break;
        default:
            /* Tout octet >= 0x80 est émis en \u00XX (interprétation Latin-1). */
            if (c < 0x20 || c >= 0x80)
                fprintf(stdout, "\\u%04x", c);
            else
                fputc(c, stdout);
            break;
        }
    }
    fputc('"', stdout);
}

typedef enum { FSTR_NODATA = -1, FSTR_NULL = 0, FSTR_VALUE = 1 } fetch_rc;

static fetch_rc fetch_str(SQLHSTMT st, SQLSMALLINT col, unsigned char *buf, size_t bufsz)
{
    SQLLEN ln = 0;
    SQLRETURN r = SQLGetData(st, col, SQL_C_CHAR, buf, (SQLLEN)bufsz, &ln);
    if (r == SQL_NO_DATA)
        return FSTR_NODATA;
    if (ln == SQL_NULL_DATA)
        return FSTR_NULL;
    return FSTR_VALUE;
}

static fetch_rc fetch_long(SQLHSTMT st, SQLSMALLINT col, long *out)
{
    SQLLEN ln = 0;
    long v = 0;
    SQLRETURN r = SQLGetData(st, col, SQL_C_SLONG, &v, 0, &ln);
    if (r == SQL_NO_DATA)
        return FSTR_NODATA;
    if (ln == SQL_NULL_DATA)
        return FSTR_NULL;
    *out = v;
    return FSTR_VALUE;
}

static void emit_str_or_null(SQLHSTMT st, SQLSMALLINT col)
{
    unsigned char v[4096];
    fetch_rc rc = fetch_str(st, col, v, sizeof v);
    if (rc == FSTR_VALUE)
        emit_string(v, strnlen((const char *)v, sizeof v));
    else
        fputs("null", stdout);
}

static void fail_msg(const char *state, const char *msg)
{
    fputs("{\"ok\":false,\"message\":", stdout);
    emit_string((const unsigned char *)state, strlen(state));
    fputc(' ', stdout);
    emit_string((const unsigned char *)msg, strlen(msg));
    fputs("}\n", stdout);
    exit(2);
}

static void fail(const char *fallback, SQLHENV env, SQLHDBC dbc, SQLHSTMT stmt)
{
    char state[6] = {0};
    char msg[2048] = {0};
    SQLSMALLINT tlen = 0;
    SQLRETURN r;

    if (stmt != SQL_NULL_HSTMT) {
        r = SQLGetDiagRec(SQL_HANDLE_STMT, stmt, 1, (SQLCHAR *)state,
                          NULL, (SQLCHAR *)msg, (SQLSMALLINT)sizeof msg, &tlen);
        if (SQL_SUCCEEDED(r))
            fail_msg(state, msg);
    }
    if (dbc != SQL_NULL_HDBC) {
        r = SQLGetDiagRec(SQL_HANDLE_DBC, dbc, 1, (SQLCHAR *)state,
                          NULL, (SQLCHAR *)msg, (SQLSMALLINT)sizeof msg, &tlen);
        if (SQL_SUCCEEDED(r))
            fail_msg(state, msg);
    }
    if (env != SQL_NULL_HENV) {
        r = SQLGetDiagRec(SQL_HANDLE_ENV, env, 1, (SQLCHAR *)state,
                          NULL, (SQLCHAR *)msg, (SQLSMALLINT)sizeof msg, &tlen);
        if (SQL_SUCCEEDED(r))
            fail_msg(state, msg);
    }
    fail_msg("HY000", fallback);
}

static void release(SQLHENV env, SQLHDBC dbc, SQLHSTMT stmt)
{
    if (stmt != SQL_NULL_HSTMT)
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    if (dbc != SQL_NULL_HDBC && SQL_SUCCEEDED(SQLDisconnect(dbc)))
        SQLFreeHandle(SQL_HANDLE_DBC, dbc);
    if (env != SQL_NULL_HENV)
        SQLFreeHandle(SQL_HANDLE_ENV, env);
}

static SQLHDBC do_connect(const char *connstr, SQLHENV *out_env)
{
    SQLHENV env = SQL_NULL_HENV;
    SQLHDBC dbc = SQL_NULL_HDBC;
    SQLRETURN r;

    r = SQLAllocHandle(SQL_HANDLE_ENV, SQL_NULL_HANDLE, &env);
    if (!SQL_SUCCEEDED(r)) {
        fputs("{\"ok\":false,\"message\":\"hfcli: echec allocation ENV\"}\n", stdout);
        exit(2);
    }
    r = SQLSetEnvAttr(env, SQL_ATTR_ODBC_VERSION, (SQLPOINTER)(intptr_t)SQL_OV_ODBC3, 0);
    if (!SQL_SUCCEEDED(r)) {
        fputs("{\"ok\":false,\"message\":\"hfcli: echec SQLSetEnvAttr ODBC3\"}\n", stdout);
        exit(2);
    }
    r = SQLAllocHandle(SQL_HANDLE_DBC, env, &dbc);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: echec allocation DBC", env, SQL_NULL_HDBC, SQL_NULL_HSTMT);

    r = SQLDriverConnect(dbc, (SQLHWND)0, (SQLCHAR *)connstr, SQL_NTS,
                         NULL, 0, NULL, SQL_DRIVER_NOPROMPT);
    if (!(r == SQL_SUCCESS || r == SQL_SUCCESS_WITH_INFO))
        fail("hfcli: SQLDriverConnect", env, dbc, SQL_NULL_HSTMT);

    *out_env = env;
    return dbc;
}

static void op_test(const char *connstr)
{
    SQLHENV env = SQL_NULL_HENV;
    SQLHDBC dbc;
    SQLHSTMT stmt = SQL_NULL_HSTMT;
    char note[128] = "";
    long long t0 = now_ms();

    dbc = do_connect(connstr, &env);
    if (SQL_SUCCEEDED(SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt))) {
        if (!SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR *)"SELECT 1", SQL_NTS)))
            strcpy(note, " (connexion etablie, mais SELECT 1 refuse par le pilote)");
    }

    printf("{\"ok\":true,\"message\":\"Connexion ODBC active%s\",\"latencyMs\":%lld}\n",
           note, now_ms() - t0);
    release(env, dbc, stmt);
    exit(0);
}

static void op_tables(const char *connstr)
{
    SQLHENV env = SQL_NULL_HENV;
    SQLHDBC dbc;
    SQLHSTMT stmt = SQL_NULL_HSTMT;
    SQLRETURN r;
    int first = 1;

    dbc = do_connect(connstr, &env);
    r = SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: echec allocation STMT", env, dbc, SQL_NULL_HSTMT);

    r = SQLTables(stmt, NULL, 0, NULL, 0, NULL, 0, NULL, 0);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLTables", env, dbc, stmt);

    fputs("{\"ok\":true,\"rows\":[", stdout);
    for (;;) {
        r = SQLFetch(stmt);
        if (r == SQL_NO_DATA)
            break;
        if (!first)
            fputc(',', stdout);
        first = 0;
        fputs("{\"TABLE_CAT\":", stdout);
        emit_str_or_null(stmt, 1);
        fputs(",\"TABLE_SCHEM\":", stdout);
        emit_str_or_null(stmt, 2);
        fputs(",\"TABLE_NAME\":", stdout);
        emit_str_or_null(stmt, 3);
        fputs(",\"TABLE_TYPE\":", stdout);
        emit_str_or_null(stmt, 4);
        fputs(",\"REMARKS\":", stdout);
        emit_str_or_null(stmt, 5);
        fputc('}', stdout);
    }
    fputs("]}\n", stdout);
    release(env, dbc, stmt);
    exit(0);
}

static void op_columns(const char *connstr, const char *table)
{
    enum { MAXCOLS = 512 };
    struct colmeta {
        long dt;
        long size;
        long nullable;
        long ordinal;
        unsigned char type[64];
        unsigned char remarks[4096];
    };
    static struct colmeta meta[MAXCOLS];
    static unsigned char dname[MAXCOLS][512];
    int nmeta = 0;
    SQLSMALLINT ncol = 0;
    SQLHENV env = SQL_NULL_HENV;
    SQLHDBC dbc;
    SQLHSTMT stmt = SQL_NULL_HSTMT;
    SQLRETURN r;
    size_t i;

    /* Le driver HFSQL sous iODBC renvoie COLUMN_NAME vide dans SQLColumns.
     * On récupère les vrais noms via les métadonnées de "SELECT * WHERE 1=0"
     * (SQLDescribeCol) puis on les fusionne avec les autres métadonnées. */
    size_t tl = strlen(table);
    char *sql = malloc(tl * 2 + 40);
    if (!sql) {
        fputs("{\"ok\":false,\"message\":\"hfcli: echec allocation SQL\"}\n", stdout);
        exit(2);
    }
    {
        char *p = sql;
        p += sprintf(p, "SELECT * FROM \"");
        for (i = 0; i < tl; i++) {
            if (table[i] == '"')
                *p++ = '"';
            *p++ = table[i];
        }
        strcpy(p, "\" WHERE 1=0");
    }

    dbc = do_connect(connstr, &env);
    r = SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: echec allocation STMT", env, dbc, SQL_NULL_HSTMT);

    r = SQLColumns(stmt, NULL, 0, NULL, 0, (SQLCHAR *)table, SQL_NTS, NULL, 0);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLColumns", env, dbc, stmt);

    for (;;) {
        if (nmeta >= MAXCOLS)
            break;
        r = SQLFetch(stmt);
        if (r == SQL_NO_DATA)
            break;
        meta[nmeta].dt = 0;
        meta[nmeta].size = 0;
        meta[nmeta].nullable = 0;
        meta[nmeta].ordinal = 0;
        meta[nmeta].type[0] = 0;
        meta[nmeta].remarks[0] = 0;
        (void)fetch_long(stmt, 5, &meta[nmeta].dt);
        (void)fetch_str(stmt, 6, meta[nmeta].type, sizeof meta[nmeta].type);
        (void)fetch_long(stmt, 7, &meta[nmeta].size);
        (void)fetch_long(stmt, 11, &meta[nmeta].nullable);
        (void)fetch_str(stmt, 12, meta[nmeta].remarks, sizeof meta[nmeta].remarks);
        (void)fetch_long(stmt, 17, &meta[nmeta].ordinal);
        nmeta++;
    }

    SQLFreeStmt(stmt, SQL_CLOSE);
    r = SQLPrepare(stmt, (SQLCHAR *)sql, SQL_NTS);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLPrepare nom colonnes", env, dbc, stmt);
    r = SQLExecute(stmt);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLExecute nom colonnes", env, dbc, stmt);

    (void)SQLNumResultCols(stmt, &ncol);
    if (ncol > MAXCOLS)
        ncol = MAXCOLS;
    for (i = 0; i < (size_t)ncol; i++) {
        SQLSMALLINT clen = 0, sqltype = 0, digits = 0, nullable = 0;
        SQLULEN csize = 0;
        memset(dname[i], 0, sizeof dname[i]);
        r = SQLDescribeCol(stmt, (SQLSMALLINT)(i + 1), dname[i], 511, &clen,
                           &sqltype, &csize, &digits, &nullable);
        (void)r;
    }

    fputs("{\"ok\":true,\"rows\":[", stdout);
    {
        int first = 1;
        for (i = 0; i < (size_t)nmeta; i++) {
            int idx = (int)meta[i].ordinal - 1;
            const unsigned char *nm =
                (ncol > 0 && idx >= 0 && idx < ncol && dname[idx][0])
                    ? dname[idx]
                    : (const unsigned char *)"";
            if (!first)
                fputc(',', stdout);
            first = 0;
            fputs("{\"COLUMN_NAME\":", stdout);
            emit_string(nm, strnlen((const char *)nm, sizeof(dname[idx])));
            fputs(",\"DATA_TYPE\":", stdout);
            printf("%ld", meta[i].dt);
            fputs(",\"TYPE_NAME\":", stdout);
            emit_string(meta[i].type, strnlen((const char *)meta[i].type, sizeof meta[i].type));
            fputs(",\"COLUMN_SIZE\":", stdout);
            printf("%ld", meta[i].size);
            fputs(",\"NULLABLE\":", stdout);
            printf("%ld", meta[i].nullable);
            fputs(",\"REMARKS\":", stdout);
            emit_string(meta[i].remarks, strnlen((const char *)meta[i].remarks, sizeof meta[i].remarks));
            fputs(",\"ORDINAL_POSITION\":", stdout);
            printf("%ld", meta[i].ordinal);
            fputc('}', stdout);
        }
    }
    fputs("]}\n", stdout);
    free(sql);
    release(env, dbc, stmt);
    exit(0);
}

static int is_integer(const char *s)
{
    char *end = NULL;
    if (!s || !*s)
        return 0;
    errno = 0;
    (void)strtoll(s, &end, 10);
    return (errno == 0 && end && *end == '\0');
}

static void op_query(const char *connstr, const char *sql, int nparams, char **params)
{
    SQLHENV env = SQL_NULL_HENV;
    SQLHDBC dbc;
    SQLHSTMT stmt = SQL_NULL_HSTMT;
    SQLRETURN r;
    SQLSMALLINT np = 0, ncol = 0;
    size_t nb, i;
    SQLCHAR **sbuf = NULL;
    SQLLEN *ilen = NULL;
    SQLLEN *ival = NULL;
    SQLCHAR **cnames = NULL;

    dbc = do_connect(connstr, &env);
    r = SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: echec allocation STMT", env, dbc, SQL_NULL_HSTMT);

    r = SQLPrepare(stmt, (SQLCHAR *)sql, SQL_NTS);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLPrepare", env, dbc, stmt);

    (void)SQLNumParams(stmt, &np);
    nb = (size_t)(np > 0 ? np : 0);
    if (nb > 0) {
        sbuf = calloc(nb, sizeof *sbuf);
        ilen = calloc(nb, sizeof *ilen);
        ival = calloc(nb, sizeof *ival);
        if (!sbuf || !ilen || !ival) {
            fputs("{\"ok\":false,\"message\":\"hfcli: echec allocation parametres\"}\n", stdout);
            exit(2);
        }
        for (i = 0; i < nb; i++) {
            const char *p = (size_t)i < (size_t)nparams ? params[i] : "";
            if (p[0] == 0x03 && strcmp(p + 1, "NULL") == 0) {
                r = SQLBindParameter(stmt, (SQLSMALLINT)(i + 1), SQL_PARAM_INPUT,
                                     SQL_C_CHAR, SQL_INTEGER, 0, 0, NULL, 0, NULL);
            } else if (is_integer(p)) {
                ival[i] = (SQLLEN)strtoll(p, NULL, 10);
                r = SQLBindParameter(stmt, (SQLSMALLINT)(i + 1), SQL_PARAM_INPUT,
                                     SQL_C_SLONG, SQL_INTEGER, 0, 0,
                                     &ival[i], 0, &ilen[i]);
            } else {
                size_t pl = strlen(p);
                if (pl > 4095)
                    pl = 4095;
                sbuf[i] = (SQLCHAR *)malloc(pl + 1);
                if (!sbuf[i]) {
                    continue;
                }
                memcpy(sbuf[i], p, pl);
                sbuf[i][pl] = 0;
                ilen[i] = SQL_NTS;
                r = SQLBindParameter(stmt, (SQLSMALLINT)(i + 1), SQL_PARAM_INPUT,
                                     SQL_C_CHAR, SQL_VARCHAR, 0, 0,
                                     sbuf[i], 0, &ilen[i]);
            }
            (void)r;
        }
    }

    r = SQLExecute(stmt);
    if (!SQL_SUCCEEDED(r))
        fail("hfcli: SQLExecute", env, dbc, stmt);

    (void)SQLNumResultCols(stmt, &ncol);
    if (ncol > 0) {
        cnames = calloc((size_t)ncol, sizeof *cnames);
        if (!cnames) {
            fputs("{\"ok\":false,\"message\":\"hfcli: echec allocation colonnes\"}\n", stdout);
            exit(2);
        }
        for (i = 0; i < (size_t)ncol; i++) {
            SQLSMALLINT clen = 0, sqltype = 0, digits = 0, nullable = 0;
            SQLULEN csize = 0;
            cnames[i] = (SQLCHAR *)calloc(1, 512);
            if (!cnames[i])
                continue;
            r = SQLDescribeCol(stmt, (SQLSMALLINT)(i + 1), cnames[i], 511,
                               &clen, &sqltype, &csize, &digits, &nullable);
            (void)r;
        }
    }

    fputs("{\"ok\":true,\"columns\":[", stdout);
    for (i = 0; i < (size_t)ncol; i++) {
        if (i)
            fputc(',', stdout);
        if (cnames[i])
            emit_string(cnames[i], strnlen((const char *)cnames[i], 512));
        else
            fputs("null", stdout);
    }
    fputs("],\"rows\":[", stdout);
    {
        int first = 1;
        for (;;) {
            r = SQLFetch(stmt);
            if (r == SQL_NO_DATA)
                break;
            if (!first)
                fputc(',', stdout);
            first = 0;
            fputc('{', stdout);
            for (i = 0; i < (size_t)ncol; i++) {
                if (i)
                    fputc(',', stdout);
                if (cnames[i]) {
                    fputc('"', stdout);
                    fwrite(cnames[i], 1, strnlen((const char *)cnames[i], 512), stdout);
                    fputs("\":", stdout);
                } else {
                    fputs("null:", stdout);
                }
                emit_str_or_null(stmt, (SQLSMALLINT)(i + 1));
            }
            fputc('}', stdout);
        }
    }
    fputs("]}\n", stdout);
    release(env, dbc, stmt);
    exit(0);
}

int main(int argc, char **argv)
{
    const char *connstr, *op;

    if (argc < 3) {
        fputs("{\"ok\":false,\"message\":\"usage: hfcli CONNSTR test|tables|columns|query [TABLE|SQL] [PARAMS...]\"}\n",
              stdout);
        return 1;
    }
    connstr = argv[1];
    op = argv[2];

    if (strcmp(op, "test") == 0) {
        op_test(connstr);
    } else if (strcmp(op, "tables") == 0) {
        op_tables(connstr);
    } else if (strcmp(op, "columns") == 0) {
        const char *table = argc > 3 ? argv[3] : NULL;
        if (!table || !*table) {
            fputs("{\"ok\":false,\"message\":\"hfcli columns: nom de table manquant\"}\n", stdout);
            return 1;
        }
        op_columns(connstr, table);
    } else if (strcmp(op, "query") == 0) {
        if (argc < 4) {
            fputs("{\"ok\":false,\"message\":\"hfcli query: SQL manquant\"}\n", stdout);
            return 1;
        }
        op_query(connstr, argv[3], argc - 4, argc > 4 ? &argv[4] : NULL);
    } else {
        fprintf(stdout, "{\"ok\":false,\"message\":\"hfcli: operateur inconnu: %s\"}", op);
        return 1;
    }
    return 0;
}