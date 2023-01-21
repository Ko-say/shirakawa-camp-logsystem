from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import MySQLdb
import time
import sys

URL = "https://web.meraki-go.com"
TERM = 2 #past[0]:2hors [1]:day [2]:week [3]:month

def setup_driver():
    driver = webdriver.Remote(
        command_executor="http://selenium:4444/wd/hub",
        options=webdriver.ChromeOptions()
    )

    driver.implicitly_wait(20)

    return driver

def setup_db_connection():
    connection = MySQLdb.connect(
        host='db',
        user='docker',
        passwd='docker',
        db='cosylab_merakigo'
    )
    return connection

def setup_db_cursor(connection):
    cursor = connection.cursor()
    return cursor

def end(driver, connection, cursor):
    driver.quit()
    connection.commit()
    cursor.close()
    connection.close()

def setup_db_table(cursor):
    cursor.execute("""CREATE TABLE IF NOT EXISTS top_page(
        datetime DATETIME NOT NULL,
        high_usage_device INT NOT NULL, 
        unique_device INT NOT NULL, 
        average_traffic float NOT NULL,
        unit text, 
        PRIMARY KEY (datetime)
        )""")

    cursor.execute("""CREATE TABLE IF NOT EXISTS connected_device(
        datetime DATETIME NOT NULL,
        mac_address text NOT NULL,
        device_name text NOT NULL,
        device_os text,
        device_traffic text NOT NULL,
        ip_address text NOT NULL,
        ap_number text,
        PRIMARY KEY (datetime, mac_address(255))
        )""")
    
    cursor.execute("""CREATE TABLE IF NOT EXISTS device_traffic(
        datetime DATETIME NOT NULL,
        traffic_name text NOT NULL,
        traffic text NOT NULL,
        PRIMARY KEY (datetime, traffic_name(255))
        )""")

def load_logindata():
    f = open('./login-data','r')
    logindata = f.readlines()
    f.close()
    return logindata

def login(driver):
    driver.get(URL)

    login = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-xd6kpl r-1guathk r-1ygmrgt']")#loginボタンクリック

    login[1].click()

    logindata = load_logindata()

    login_mail = driver.find_element(By.XPATH,"//input[@placeholder='email@email.com']")#id,password入力
    login_mail.send_keys(logindata[0])

    login_pass = driver.find_element(By.XPATH,"//input[@placeholder='Password']")
    login_pass.send_keys(logindata[1])

    login_button = driver.find_element(By.XPATH,"//div[@class='css-901oao r-jwli3a r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-q4m81j']")#loginボタンクリック
    driver.save_screenshot('login.png')
    login_button.click()

    time.sleep(10)

    print("login...done")

def select_term(driver):
    term = driver.find_element(By.XPATH,"//div[@class='css-1dbjc4n r-1awozwy r-1u2vur8 r-qklmqi r-1j7xwkz r-5kkj8d r-1loqt21 r-18u37iz r-h3s6tt r-1wtj0ep r-1ydw1k6 r-1wzrnnt r-1otgn73 r-1i6wzkk r-lrvibr']") #期間設定
    term.click()
    past = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-k23652 r-1enofrn r-13uqrnb r-16dba41 r-35jf7b']") 
    past[TERM].click()

    driver.refresh()
    time.sleep(10)
    print('refresh...done')

def judge_nodevice(driver):
    elements = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")
    print(len(elements))
    if(len(elements)>=3):
        return 0
    else:
        return 1

def judge_high_usage_device(driver):
    elements = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")
    return len(elements)

def get_toppage(driver, cursor):
    flag_high_usage_device = judge_high_usage_device(driver)
    if(flag_high_usage_device):
        high_usage_device = driver.find_element(By.XPATH,"//span[@class='css-901oao css-16my406 r-1bt9900 r-qwp1k9 r-13uqrnb r-16dba41']").get_attribute("textContent")
        unique_device = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[0].get_attribute("textContent")
        average_traffic = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[1].get_attribute("textContent")
        unit = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-1ew0g4l r-k23652 r-1inkyih r-13uqrnb r-1od2jal']")[0].get_attribute("textContent")
        index_element_unique_device = 0
    else:
        high_usage_device = 0
        unique_device = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[1].get_attribute("textContent")
        average_traffic = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[2].get_attribute("textContent")
        unit = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-1ew0g4l r-k23652 r-1inkyih r-13uqrnb r-1od2jal']")[0].get_attribute("textContent")
        index_element_unique_device  = 1
    
    print(high_usage_device)
    print(unique_device)
    print(average_traffic)
    print(unit)

    sql = "INSERT INTO top_page (datetime, high_usage_device, unique_device, average_traffic, unit) VALUES (cast( now() as datetime), %s, %s, %s, %s)"
    cursor.execute(sql, (high_usage_device, unique_device, average_traffic, unit))
    return index_element_unique_device

def get_device(driver, cursor, index_element_unique_device):
    device_num = driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[index_element_unique_device].get_attribute("textContent")
    print(device_num)

    for i in range(0, int(device_num)):
        print("----------------------")
        driver.refresh()

        driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']")
        text_element_num = len(driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']"))

        driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")
        driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[index_element_unique_device].click()

        while(len(driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']")) != int(device_num)+text_element_num): #全部のデバイスが表示されるまで待機
            pass
        device_traffic = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[i+text_element_num].get_attribute("textContent")

        count = 0
        flagPageMove = 0
        driver.implicitly_wait(0.1)
        while(len(driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']")) == 0):
            driver.execute_script("arguments[0].click();", driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41']")[i+1])
        driver.implicitly_wait(20)
        '''while(flagPageMove==0):
            print(count)
            driver.execute_script("arguments[0].click();", driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41']")[i+1])
            time.sleep(0.1)
            if(len(driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']")) == 1):
                flagPageMove=1
            count+=1'''

        elements = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")

        if len(elements)==5:    #デバイス情報がフルで表示されている場合
            # ap_number = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-1loqt21 r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[1].get_attribute("textContent")
            device_mac_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[3].get_attribute("textContent")
            device_name = driver.find_element(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']").get_attribute("textContent")
            device_os = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[2].get_attribute("textContent")
            device_ip_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[4].get_attribute("textContent")

            print(device_mac_address)
            print(device_name)
            print(device_os)
            print(device_traffic)
            print(device_ip_address)
            # print(ap_number)

            sql = "INSERT INTO connected_device (datetime, mac_address, device_name, device_os, device_traffic, ip_address) VALUES (cast( now() as datetime), %s, %s, %s, %s, %s)"
            cursor.execute(sql, (device_mac_address, device_name, device_os, device_traffic, device_ip_address))

        elif(len(elements)==4):
            ex_elements = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-cv4lhi r-13uqrnb r-16dba41']")

            if(len(ex_elements)==5):    #Radioのみない場合
                # ap_number = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-1loqt21 r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[1].get_attribute("textContent")
                device_mac_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[2].get_attribute("textContent")
                device_name = driver.find_element(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']").get_attribute("textContent")
                device_os = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[1].get_attribute("textContent")
                device_ip_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[3].get_attribute("textContent")

                print(device_mac_address)
                print(device_name)
                print(device_os)
                print(device_traffic)
                print(device_ip_address)
                # print(ap_number)

                sql = "INSERT INTO connected_device (datetime, mac_address, device_name, device_os, device_traffic, ip_address) VALUES (cast( now() as datetime), %s, %s, %s, %s, %s)"
                cursor.execute(sql, (device_mac_address, device_name, device_os, device_traffic, device_ip_address))
            
            else:   #OSのみない場合
                # ap_number = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-1loqt21 r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[1].get_attribute("textContent")
                device_mac_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[2].get_attribute("textContent")
                device_name = driver.find_element(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']").get_attribute("textContent")
                device_ip_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[3].get_attribute("textContent")

                print(device_mac_address)
                print(device_name)
                print(device_traffic)
                print(device_ip_address)
                # print(ap_number)

                sql = "INSERT INTO connected_device (datetime, mac_address, device_name, device_traffic, ip_address) VALUES (cast( now() as datetime), %s, %s, %s, %s)"
                cursor.execute(sql, (device_mac_address, device_name, device_traffic, device_ip_address))

        
        elif(len(elements)==3):   #RadioもOSも表示されていない場合
            # ap_number = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3187cr r-1loqt21 r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[1].get_attribute("textContent")
            device_mac_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[1].get_attribute("textContent")
            device_name = driver.find_element(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-1loqt21 r-1bt9900 r-1ui5ee8 r-13uqrnb r-16dba41 r-17rnw9f']").get_attribute("textContent")
            device_ip_address = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41 r-1kb76zh r-fdjqy7']")[2].get_attribute("textContent")

            print(device_mac_address)
            print(device_name)
            print(device_traffic)
            print(device_ip_address)
            # print(ap_number)

            sql = "INSERT INTO connected_device (datetime, mac_address, device_name, device_traffic, ip_address) VALUES (cast( now() as datetime), %s, %s, %s, %s)"
            cursor.execute(sql, (device_mac_address, device_name, device_traffic, device_ip_address))
        
        else:
            print("おかしい!")


def get_traffic(driver, cursor, index_element_traffic):
    driver.refresh()
    time.sleep(5)
    text_element_num = len(driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']"))
    driver.find_elements(By.XPATH,"//span[@class='css-901oao css-16my406 r-3187cr r-1bt9900 r-sembhe r-13uqrnb r-1kfrs79']")[index_element_traffic].click()
    time.sleep(5)
    traffic_num = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41']")
    traffics = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']")
    for i in range(0, int(len(traffic_num))-1):
        print("----------------------")
        traffic_name = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-1ew0g4l r-k23652 r-cv4lhi r-13uqrnb r-16dba41']")[i+1].get_attribute("textContent")
        traffic = driver.find_elements(By.XPATH,"//div[@class='css-901oao r-3hb25e r-k23652 r-1inkyih r-13uqrnb r-16dba41']")[i+text_element_num].get_attribute("textContent")
        print(traffic_name)
        print(traffic)

        sql = "INSERT INTO device_traffic (datetime, traffic_name, traffic) VALUES (cast( now() as datetime), %s, %s)"
        cursor.execute(sql, (traffic_name, traffic))

if __name__ == '__main__':

    #初期設定
    driver = setup_driver()
    connection = setup_db_connection()
    cursor = setup_db_cursor(connection)
    setup_db_table(cursor)

    #ログイン、期間設定、接続デバイスの有無確認
    login(driver)
    select_term(driver)
    flag_nodevice = judge_nodevice(driver)

    #NoDeviceならプログラム終了
    if(flag_nodevice):
        print("NoDevice")
        sql = "INSERT INTO top_page (datetime, high_usage_device, unique_device, average_traffic) VALUES (cast( now() as datetime), %s, %s, %s)"
        cursor.execute(sql, (0, 0, 0))
        end(driver, connection, cursor)
        sys.exit()
    
    #トップページの情報取得
    index_element_unique_device = get_toppage(driver, cursor)
    index_element_traffic = index_element_unique_device + 1

    #各デバイスの詳細情報取得
    get_device(driver, cursor, index_element_unique_device)

    get_traffic(driver, cursor, index_element_traffic)

    #終了処理
    end(driver, connection, cursor)