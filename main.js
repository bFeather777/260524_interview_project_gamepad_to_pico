const HID = require('node-hid');
const noble = require('@abandonware/noble');

// ==========================================
// 參數設定區
// ==========================================
const PS4_VENDOR_ID = 1356;
const PS4_PRODUCT_ID = 2508;

// 對齊 Pico 2W 上的 BLE 服務與特徵值 UUID (Nordic UART 標準)
const SERVICE_UUID = '6e400001b5a3f393e0a9e50e24dcca9e';
const RX_CHAR_UUID = '6e400002b5a3f393e0a9e50e24dcca9e';
const PICO_NAME = 'Pico-D'; // Pico的名稱從這邊修改

let bleCharacteristic = null;
let ps4Device = null;

// ==========================================
// 藍牙 BLE 連線邏輯
// ==========================================
console.log("正在啟動 Mac 藍牙掃描...");

noble.on('stateChange', async (state) => {
    if (state === 'poweredOn') {
        // 開始掃描特定的服務 UUID
        await noble.startScanningAsync([SERVICE_UUID], false);
        console.log(`正在尋找藍牙名稱為 [${PICO_NAME}] 的 Pico 2W...`);
    } else {
        await noble.stopScanningAsync();
    }
});

noble.on('discover', async (peripheral) => {
    // 檢查設備名稱是否為 PICO_NAME 設定的名稱
    if (peripheral.advertisement.localName === PICO_NAME) {
        console.log(`成功找到目標裝置: ${peripheral.advertisement.localName}! 正在連接...`);
        await noble.stopScanningAsync();
        
        await peripheral.connectAsync();
        console.log('藍牙已連接！正在獲取服務特徵值...');
        
        const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync([SERVICE_UUID], [RX_CHAR_UUID]);
        bleCharacteristic = characteristics[0];
        
        console.log('🎉 Pico 2W 藍牙通訊全線打通！');
        
        // 藍牙成功後，才啟動手把監聽
        startJoystickListening();
    }
});

// ==========================================
// 🎮 PS4 手把監聽與數據映射
// ==========================================
function startJoystickListening() {
    console.log("正在尋找 PS4 手把...");
    try {
        ps4Device = new HID.HID(PS4_VENDOR_ID, PS4_PRODUCT_ID);
        console.log("成功連接 PS4 手把！開始監聽按鍵，隨時準備隔空送出訊號...");

        // 用來實施「邊緣觸發」的狀態開關，防範連續高頻重複送資料
        let lastCommand = "";

        ps4Device.on("data", (data) => {
            // 💡 核心解密：PS4 原始數據流的二進位位元遮罩（Bitmask）
            // 在大多數 MacOS 藍牙/有線模式下，主要的四顆幾何按鍵藏在 data[5]
            // 低 4 位元 (Low 4 bits) 代表十字鍵，高 4 位元 (High 4 bits) 代表幾何鍵
            
            const buttonByte = data[5];
            let currentCommand = "reset"; // 預設放開按鍵時為 reset

            // 解開 PS4 特定的狀態數值
            if ((buttonByte & 0x20) === 0x20) {
                currentCommand = "cross";     // x 鍵 (通常是 32 或與其結合的值)
            } else if ((buttonByte & 0x40) === 0x40) {
                currentCommand = "circle";    // o 鍵 (通常是 64)
            } else if ((buttonByte & 0x10) === 0x10) {
                currentCommand = "square";    // ☐ 鍵 (通常是 16)
            } else if ((buttonByte & 0x80) === 0x80) {
                currentCommand = "triangle";  // ▲ 鍵 (通常是 128)
            }

            // ⚡ 實施防禦性防抖：只有在「按鍵狀態改變」的瞬间才發送 Token
            if (currentCommand !== lastCommand) {
                lastCommand = currentCommand;
                sendBleToken(currentCommand);
            }
        });

        ps4Device.on("error", (err) => {
            console.error("手把連線發生錯誤:", err);
        });

    } catch (error) {
        console.error("無法開啟 PS4 手把，原因:", error.message);
    }
}

// ==========================================
// 🚀 傳送指令給 Pico 的封裝函數
// ==========================================
function sendBleToken(commandStr) {
    if (!bleCharacteristic) {
        console.warn("藍牙通訊尚未就緒，放棄發送:", commandStr);
        return;
    }
    
    // 將字串（例如 "cross"）轉換為 Buffer 送出，完美對齊 Pico 端的 .decode('utf-8')
    const buffer = Buffer.from(commandStr);
    bleCharacteristic.write(buffer, true, (err) => {
        if (err) console.error("發送失敗:", err);
        else console.log(`【Node-HID 觸發】成功無線送出指令: -> ${commandStr}`);
    });
}