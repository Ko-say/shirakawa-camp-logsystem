const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const cookieParser = require('cookie-parser');
const app = express();

const connection = mysql.createConnection({
    host: 'db',
    user: 'docker',
    password: 'docker',
    database: 'cosylab_merakigo',
    timezone: 'jst'
});

connection.connect((err) => {
    if(err){
        console.log('error connecting: '+err.stack);
    }
    console.log('success');
});

const port = '3000';

app.use(express.static('public'));

app.use(express.urlencoded({extended: true}));

app.use(cookieParser());

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.redirect('/Today');
});

app.get('/Today', (req, res) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;

    console.log(today)

    const sql = `SELECT * FROM top_page WHERE datetime > '${today}'`;
    let totalAverageTraffic = 0;
    let totalDevices = 0;
    connection.query(
        sql, (error, results) => {

            for(let result of results){
                if(result.unit === 'KB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic / 1000;
                }else if(result.unit === 'MB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic;
                }else if(result.unit === 'GB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic * 1000;
                }
            };

            connection.query(
                `SELECT count(DISTINCT mac_address) FROM connected_device WHERE datetime > '${today}'`,
                (error, results) => {
                    const key = 'count(DISTINCT mac_address)';
                    totalDevices = results[0][key];
                    totalAverageTraffic = Math.floor(totalAverageTraffic * 100) / 100;
                    res.render('today', { totalAverageTraffic, totalDevices });
                }
            );
        }
    );
});

app.get('/Today/Devices', (req, res) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;

    console.log(today)

    let sql = `SELECT * FROM connected_device WHERE datetime > '${today}'`;

    let uniqueMacAddresses = [];
    let uniqueDevices = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { mac_address } = result;
            if(!uniqueMacAddresses.includes(mac_address)){
                uniqueMacAddresses.push(mac_address);
            }
        }
        console.log(uniqueMacAddresses);

        if(uniqueMacAddresses.length === 0){
            res.render('nodevice');
        }

        for(let uniqueMacAddress of uniqueMacAddresses){
            sql = `SELECT * FROM connected_device WHERE datetime > '${today}' && mac_address = '${uniqueMacAddress}'`;
            let totalTraffic = 0;
            const uniqueDevice = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { mac_address, device_name, device_os, ip_address, ap_number } = result;
                    uniqueDevice.mac_address = mac_address;
                    uniqueDevice.device_name = device_name;
                    uniqueDevice.device_os = device_os;
                    uniqueDevice.ip_address = ip_address;
                    uniqueDevice.ap_number = ap_number;
                    let value = result.device_traffic.slice(0, -3);
                    let unit = result.device_traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueDevice.device_traffic = totalTraffic;
                uniqueDevices.push(uniqueDevice);
                if(uniqueMacAddresses.length === uniqueDevices.length){
                    res.render('devices', {uniqueDevices});
                    console.log(uniqueDevices);
                }
            });
        };
    });
});

app.get('/Today/Traffics', (req, res)=>{
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;

    console.log(today)

    let sql = `SELECT * FROM device_traffic WHERE datetime > '${today}'`;

    let uniqueTrafficNames = [];
    let uniqueTraffics = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { traffic_name } = result;
            if(!uniqueTrafficNames.includes(traffic_name)){
                uniqueTrafficNames.push(traffic_name);
            }
        }
        console.log(uniqueTrafficNames);

        if(uniqueTrafficNames.length === 0){
            res.render('notraffic');
        }

        for(let uniqueTrafficName of uniqueTrafficNames){
            sql = `SELECT * FROM device_traffic WHERE datetime > '${today}' && traffic_name = '${uniqueTrafficName}'`;
            let totalTraffic = 0;
            const uniqueTraffic = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { traffic_name, traffic } = result;
                    uniqueTraffic.traffic_name = traffic_name;
                    let value = result.traffic.slice(0, -3);
                    let unit = result.traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueTraffic.traffic = totalTraffic;
                uniqueTraffics.push(uniqueTraffic);
                if(uniqueTrafficNames.length === uniqueTraffics.length){
                    res.render('traffics', {uniqueTraffics});
                    console.log(uniqueTraffics);
                }
            });
        };
    });
});

app.get('/ThisWeek', (req, res) => {
    const now = new Date();
    now.setDate(now.getDate()-6);
    const thisWeek = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisWeek);

    const sql = `SELECT * FROM top_page WHERE datetime > '${thisWeek}'`;
    let totalAverageTraffic = 0;
    let totalDevices = 0;
    connection.query(
        sql, (error, results) => {

            for(let result of results){
                if(result.unit === 'KB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic / 1000;
                }else if(result.unit === 'MB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic;
                }else if(result.unit === 'GB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic * 1000;
                }
            };

            connection.query(
                `SELECT count(DISTINCT mac_address) FROM connected_device WHERE datetime > '${thisWeek}'`,
                (error, results) => {
                    const key = 'count(DISTINCT mac_address)';
                    totalDevices = results[0][key];
                    totalAverageTraffic = Math.floor(totalAverageTraffic * 100) / 100;
                    res.render('thisweek', { totalAverageTraffic, totalDevices });
                }
            );
        }
    );
});

app.get('/ThisWeek/Devices', (req, res) => {
    const now = new Date();
    now.setDate(now.getDate()-6);
    const thisWeek = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisWeek)

    let sql = `SELECT * FROM connected_device WHERE datetime > '${thisWeek}'`;

    let uniqueMacAddresses = [];
    let uniqueDevices = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { mac_address } = result;
            if(!uniqueMacAddresses.includes(mac_address)){
                uniqueMacAddresses.push(mac_address);
            }
        }
        console.log(uniqueMacAddresses);

        for(let uniqueMacAddress of uniqueMacAddresses){
            sql = `SELECT * FROM connected_device WHERE datetime > '${thisWeek}' && mac_address = '${uniqueMacAddress}'`;
            let totalTraffic = 0;
            const uniqueDevice = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { mac_address, device_name, device_os, ip_address, ap_number } = result;
                    uniqueDevice.mac_address = mac_address;
                    uniqueDevice.device_name = device_name;
                    uniqueDevice.device_os = device_os;
                    uniqueDevice.ip_address = ip_address;
                    uniqueDevice.ap_number = ap_number;
                    let value = result.device_traffic.slice(0, -3);
                    let unit = result.device_traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueDevice.device_traffic = totalTraffic;
                uniqueDevices.push(uniqueDevice);
                if(uniqueMacAddresses.length === uniqueDevices.length){
                    res.render('devices', {uniqueDevices});
                    console.log(uniqueDevices)
                }
            });
        };
    });
});

app.get('/ThisWeek/Traffics', (req, res)=>{
    const now = new Date();
    now.setDate(now.getDate()-6);
    const thisWeek = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisWeek)

    let sql = `SELECT * FROM device_traffic WHERE datetime > '${thisWeek}'`;

    let uniqueTrafficNames = [];
    let uniqueTraffics = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { traffic_name } = result;
            if(!uniqueTrafficNames.includes(traffic_name)){
                uniqueTrafficNames.push(traffic_name);
            }
        }
        console.log(uniqueTrafficNames);

        if(uniqueTrafficNames.length === 0){
            res.render('notraffic');
        }

        for(let uniqueTrafficName of uniqueTrafficNames){
            sql = `SELECT * FROM device_traffic WHERE datetime > '${thisWeek}' && traffic_name = '${uniqueTrafficName}'`;
            let totalTraffic = 0;
            const uniqueTraffic = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { traffic_name, traffic } = result;
                    uniqueTraffic.traffic_name = traffic_name;
                    let value = result.traffic.slice(0, -3);
                    let unit = result.traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueTraffic.traffic = totalTraffic;
                uniqueTraffics.push(uniqueTraffic);
                if(uniqueTrafficNames.length === uniqueTraffics.length){
                    res.render('traffics', {uniqueTraffics});
                    console.log(uniqueTraffics);
                }
            });
        };
    });
});

app.get('/ThisMonth', (req, res) => {
    const now = new Date();
    now.setMonth(now.getMonth()-1);
    const thisMonth = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisMonth);

    const sql = `SELECT * FROM top_page WHERE datetime > '${thisMonth}'`;
    let totalAverageTraffic = 0;
    let totalDevices = 0;
    connection.query(
        sql, (error, results) => {

            for(let result of results){
                if(result.unit === 'KB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic / 1000;
                }else if(result.unit === 'MB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic;
                }else if(result.unit === 'GB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic * 1000;
                }
            };

            connection.query(
                `SELECT count(DISTINCT mac_address) FROM connected_device WHERE datetime > '${thisMonth}'`,
                (error, results) => {
                    const key = 'count(DISTINCT mac_address)';
                    totalDevices = results[0][key];
                    totalAverageTraffic = Math.floor(totalAverageTraffic * 100) / 100;
                    res.render('thismonth', { totalAverageTraffic, totalDevices });
                }
            );
        }
    );
});

app.get('/ThisMonth/Devices', (req, res) => {
    const now = new Date();
    now.setMonth(now.getMonth()-1);
    const thisMonth = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisMonth);

    let sql = `SELECT * FROM connected_device WHERE datetime > '${thisMonth}'`;

    let uniqueMacAddresses = [];
    let uniqueDevices = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { mac_address } = result;
            if(!uniqueMacAddresses.includes(mac_address)){
                uniqueMacAddresses.push(mac_address);
            }
        }
        console.log(uniqueMacAddresses);

        for(let uniqueMacAddress of uniqueMacAddresses){
            sql = `SELECT * FROM connected_device WHERE datetime > '${thisMonth}' && mac_address = '${uniqueMacAddress}'`;
            let totalTraffic = 0;
            const uniqueDevice = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { mac_address, device_name, device_os, ip_address, ap_number } = result;
                    uniqueDevice.mac_address = mac_address;
                    uniqueDevice.device_name = device_name;
                    uniqueDevice.device_os = device_os;
                    uniqueDevice.ip_address = ip_address;
                    uniqueDevice.ap_number = ap_number;
                    let value = result.device_traffic.slice(0, -3);
                    let unit = result.device_traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueDevice.device_traffic = totalTraffic;
                uniqueDevices.push(uniqueDevice);
                if(uniqueMacAddresses.length === uniqueDevices.length){
                    res.render('devices', {uniqueDevices});
                    console.log(uniqueDevices)
                }
            });
        };
    });
});

app.get('/ThisMonth/Traffics', (req, res)=>{
    const now = new Date();
    now.setMonth(now.getMonth()-1);
    const thisMonth = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    console.log(thisMonth)

    let sql = `SELECT * FROM device_traffic WHERE datetime > '${thisMonth}'`;

    let uniqueTrafficNames = [];
    let uniqueTraffics = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { traffic_name } = result;
            if(!uniqueTrafficNames.includes(traffic_name)){
                uniqueTrafficNames.push(traffic_name);
            }
        }
        console.log(uniqueTrafficNames);

        if(uniqueTrafficNames.length === 0){
            res.render('notraffic');
        }

        for(let uniqueTrafficName of uniqueTrafficNames){
            sql = `SELECT * FROM device_traffic WHERE datetime > '${thisMonth}' && traffic_name = '${uniqueTrafficName}'`;
            let totalTraffic = 0;
            const uniqueTraffic = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { traffic_name, traffic } = result;
                    uniqueTraffic.traffic_name = traffic_name;
                    let value = result.traffic.slice(0, -3);
                    let unit = result.traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueTraffic.traffic = totalTraffic;
                uniqueTraffics.push(uniqueTraffic);
                if(uniqueTrafficNames.length === uniqueTraffics.length){
                    res.render('traffics', {uniqueTraffics});
                    console.log(uniqueTraffics);
                }
            });
        };
    });
});

app.get('/SelectTermForm', (req, res) => {
    res.render('selecttermform');
});

app.post('/SelectTerm', (req, res) => {
    console.log(req.body);
    res.cookie('inputDateFrom', req.body.inputDateFrom);
    res.cookie('inputTimeFrom', req.body.inputTimeFrom);
    res.cookie('inputDateTo', req.body.inputDateTo);
    res.cookie('inputTimeTo', req.body.inputTimeTo);

    const from = `${req.body.inputDateFrom} ${req.body.inputTimeFrom}`;
    const to = `${req.body.inputDateTo} ${req.body.inputTimeTo}`;

    const sql = `SELECT * FROM top_page WHERE datetime > '${from}' && datetime < '${to}'`;
    let totalAverageTraffic = 0;
    let totalDevices = 0;

    connection.query(
        sql, (error, results) => {

            for(let result of results){
                if(result.unit === 'KB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic / 1000;
                }else if(result.unit === 'MB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic;
                }else if(result.unit === 'GB'){
                    totalAverageTraffic = totalAverageTraffic + result.average_traffic * 1000;
                }
            };

            connection.query(
                `SELECT count(DISTINCT mac_address) FROM connected_device WHERE datetime > '${from}' && datetime < '${to}'`,
                (error, results) => {
                    const key = 'count(DISTINCT mac_address)';
                    totalDevices = results[0][key];
                    totalAverageTraffic = Math.floor(totalAverageTraffic*100)/100;
                    res.render('selectterm', { totalAverageTraffic, totalDevices, from, to});
                }
            );
        }
    );
});

app.get('/SelectTerm/Devices', (req, res) => {
    const from = `${req.cookies.inputDateFrom} ${req.cookies.inputTimeFrom}`;
    const to = `${req.cookies.inputDateTo} ${req.cookies.inputTimeTo}`;

    let sql = `SELECT * FROM connected_device WHERE datetime > '${from}' && datetime < '${to}'`;

    let uniqueMacAddresses = [];
    let uniqueDevices = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { mac_address } = result;
            if(!uniqueMacAddresses.includes(mac_address)){
                uniqueMacAddresses.push(mac_address);
            }
        }
        console.log(uniqueMacAddresses);

        for(let uniqueMacAddress of uniqueMacAddresses){
            sql = `SELECT * FROM connected_device WHERE datetime > '${from}' && datetime < '${to}' && mac_address = '${uniqueMacAddress}'`;
            let totalTraffic = 0;
            const uniqueDevice = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { mac_address, device_name, device_os, ip_address, ap_number } = result;
                    uniqueDevice.mac_address = mac_address;
                    uniqueDevice.device_name = device_name;
                    uniqueDevice.device_os = device_os;
                    uniqueDevice.ip_address = ip_address;
                    uniqueDevice.ap_number = ap_number;
                    let value = result.device_traffic.slice(0, -3);
                    let unit = result.device_traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueDevice.device_traffic = totalTraffic;
                uniqueDevices.push(uniqueDevice);
                if(uniqueMacAddresses.length === uniqueDevices.length){
                    res.render('devices', {uniqueDevices});
                    console.log(uniqueDevices);
                }
            });
        };
    });
});

app.get('/SelectTerm/Traffics', (req, res)=>{
    const from = `${req.cookies.inputDateFrom} ${req.cookies.inputTimeFrom}`;
    const to = `${req.cookies.inputDateTo} ${req.cookies.inputTimeTo}`;

    let sql = `SELECT * FROM device_traffic WHERE datetime > '${from}' && datetime < '${to}'`;

    let uniqueTrafficNames = [];
    let uniqueTraffics = [];

    connection.query(sql, (error, results) => {
        console.log(results);
        for(let result of results){
            const { traffic_name } = result;
            if(!uniqueTrafficNames.includes(traffic_name)){
                uniqueTrafficNames.push(traffic_name);
            }
        }
        console.log(uniqueTrafficNames);

        if(uniqueTrafficNames.length === 0){
            res.render('notraffic');
        }

        for(let uniqueTrafficName of uniqueTrafficNames){
            sql = `SELECT * FROM device_traffic WHERE datetime > '${from}' && datetime < '${to}' && traffic_name = '${uniqueTrafficName}'`;
            let totalTraffic = 0;
            const uniqueTraffic = {};
            connection.query(sql, (error, results) => {
                for(let result of results){
                    const  { traffic_name, traffic } = result;
                    uniqueTraffic.traffic_name = traffic_name;
                    let value = result.traffic.slice(0, -3);
                    let unit = result.traffic.slice(-2);
                    if(unit === 'KB'){
                        totalTraffic = totalTraffic + Number(value) / 1000;
                    }else if(unit === 'MB'){
                        totalTraffic = totalTraffic + Number(value);
                    }else if(unit === 'GB'){
                        totalTraffic = totalTraffic + Number(value) * 1000;
                    }
                }
                totalTraffic = Math.floor(totalTraffic * 100) / 100;
                uniqueTraffic.traffic = totalTraffic;
                uniqueTraffics.push(uniqueTraffic);
                if(uniqueTrafficNames.length === uniqueTraffics.length){
                    res.render('traffics', {uniqueTraffics});
                    console.log(uniqueTraffics);
                }
            });
        };
    });
});

app.use((req, res) => {
    res.status(404).send('Page is Not Found');
});

app.listen(port, () => {
    console.log(`ポート${port}で待受中`);
});