const sql = require('mssql/msnodesqlv8');

const config = {
    server: 'DESKTOP-DHGF327\\SQLEXPRESS02',
    database: 'ChitalnyaDB',
    options: {
        trustedConnection: true,
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    
    beforeConnect: function (config) {
        if (config.conn_str) {
            config.conn_str = config.conn_str.replace(
                'SQL Server Native Client 11.0', 
                'ODBC Driver 17 for SQL Server'
            );
        }
    }
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Подключение к SQL Server установлено');
        return pool;
    })
    .catch(err => {
        console.error('Ошибка подключения к БД:', err);
    });

module.exports = { sql, poolPromise };