## 整體流程
1.首先先引用藍牙和手把的函式庫
2.建立USB設備的數值和BLE中我們需要的服務特徵(UUID)
3.確認主機的藍牙狀態變成powerOn開啟，若有開啟則開始掃描周圍的BLE裝置
4.尋找接收到的藍芽訊號，是不是出自我們指定的Client--pico2W
5.若有找到則讀取pico2W服務特徵
6.藍牙就緒後，才啟動手把監聽，透過Vendor ID和Product ID找到指定的PS4手把
7.若正確則聽取傳來的data，擷取其中data[5]這個位置的訊號內容
8.把這個訊號內容與我們已知的按鈕訊號值取AND作比對，將得到的結果輸到currentCmd
9.並利用一個簡單的if作訊號的防抖判斷：只有狀態改變的瞬間才呼叫sendBleToken

## sendBleToken函數
10.確定Pico2W的藍牙有無連接到，若沒有則不會繼續
11.若有連接，則依照剛剛手把輸入到主程式，替換的commandStr，先用Buffer.from這個函數轉換成buffer
12.以bleCharacteristic這個特徵值的方法作寫入pico2W

## 選擇瀏覽器版本的原因
1.考慮到面試場合的可攜性，不想現場開VS Code，而是用編譯好的執行檔（或其他方式）這種「封裝好的形式」呈現
2.選擇可以在平板瀏覽器直接執行的方案，盡量少用電腦（當時還沒有用電腦播投影片）
3.遇到iPad Web Bluetooth權限限制，目前是用掛載GitHub Pages，搭配支援Web Bluetooth的第三方瀏覽器（Bluefy）繞過iPad的權限限制。當時還沒有用電腦播投影片。
