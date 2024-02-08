import dotenv from 'dotenv'
import mysql, {Connection} from 'mysql'

dotenv.config();

interface db {
    host: string,
    port: number,
    user: string,
    password: string,
    database: string
};

const dbInfo:db = {
    host: process.env.MYSQL_HOST || '',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USERID || '',
    password: process.env.MYSQL_USERPW || '',
    database: process.env.MYSQL_DBNAME || ''
};

export const init = () => {
    return mysql.createConnection(dbInfo);
}

export const connect = (conn: Connection) => {
    return new Promise<void>((resolve, reject) => {
        conn.connect((error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        })
    });
}

export const query = (conn: Connection, queryString: string, values?: any[]) => {
    return new Promise<any>((resolve, reject) => {
        conn.query(queryString, values, (error, results) => {
            if(error) {
                reject(error);
            } else {
                resolve(results);
            }
        })
    })
}