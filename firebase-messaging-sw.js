import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { enc } from "crypto-js";


self.ReWebSDK = {};
self.ReWebSDK.build = {
    release: __buildDate__,
    version: __buildVersion__
};


const campaignTracking = "/webCampaignTracking";

const Custom_Events = "/CustomEvents";

const User_Journey = "/UserJourney";

const User_Register = "/UserRegister";

const Web_SDK_Blast = "/webSDKBlast";

const RUN_Baseurl = __urlconfig__;

// const RUN_Baseurl = 'https://sdk.resu.io/Campaign';

const UAT_Baseurl = "https://sdk-dr.rsut.io/Campaign";

const Mad_Baseurl = "https://maddr1.rsut.io/Campaign";

const BIZ_Baseurl = 'https://b.resu.io/Campaign';

const Team_Baseurl = 'https://l.resu.io/Campaign';

const RUN_Rsut_Baseurl = 'https://sdk.rsut.io/Campaign';

// const ResulFivePointO_Baseurl = "https://sdk.resul.io/Campaign";

// const Team_ResulFivePointO_Baseurl = "https://sdk.resul.team/Campaign"

const smartSDKBaseUrl = "https://sdk.smartdx.co/Campaign";

const environment = "RUN";

let browserName = "";






const getBaseUrl = async (apiMethod) => {

    let Baseurl = '';

    switch (environment) {

        case "RUN":
            Baseurl = RUN_Baseurl
            break;
        case "BIZ":
            Baseurl = BIZ_Baseurl
            break;
        case "TEAM":
            Baseurl = Team_Baseurl
            break;
        default:
            Baseurl = RUN_Baseurl
            break;
    }
    Baseurl = await getIDB('_tenantId').then(res => {

        switch (res) {
            case "5f7a2e8e_1bdb_4739_9d28_278a2759394c":
                return RUN_Rsut_Baseurl;

            case "f4f0811b_658c_45e7_9432_2f307b93c235":
                if (self.location.origin.includes("visionbank.resulticks.net")) {
                    return RUN_Baseurl;
                } else {
                    return RUN_Baseurl;
                }

            // case "41d49b0f_d92b_4435_9fc8_48740c8c4ad1":
            //     return Team_ResulFivePointO_Baseurl;

            // case "ca88f5a3_e4ea_4ba7_bd11_50b526ba5569":
            // case "50af9d59_104d_4ebc_aacd_309901837175":
            // case "cac046a5_5950_45c6_9a0d_da88713a537c":
            // case "c0ccebbd_3bc6_4c04_ba65_227a75517eff":
            // case "e46a7a28_bae0_4c0e_a0a5_42533404837b":
            // case "e97f7484_e6df_49a8_adc2_e4cfa567b0ad":
            // case "e1560ffc_7f24_4bbc_9b7e_26391d0fc3c0":
            // case "b4f393fb_5d16_4678_aa99_aac7172e6666":
            //     return ResulFivePointO_Baseurl;

            case "39d4ecc6_a0e0_46d8_870d_3368e9a2a347":
                return smartSDKBaseUrl;

            default:
                return RUN_Baseurl;
        }

    })

    console.log(`Environment: ${environment}, BaseUrl: ${Baseurl}`);
    return Baseurl + apiMethod;
}


const rFD = (length) => {
    try {
        const characters = 'h@k$nde';
        let result = ' ';
        const charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    } catch (error) { };
}

const gD = (v) => {
    try {
        if (!!v && typeof v == "string") {
            try {
                return atob(v.slice(3, -2));
            } catch (error) { };
        } else {
            return;
        }
    } catch (error) { };
}


const sD = (v) => {
    try {
        if (!!v && typeof v == 'string') {
            try {
                let d = rFD(5);
                return d.trim().substring(0, 3) + btoa(v) + d.trim().slice(3);
            } catch (error) { };
        } else if (!!v && typeof v == 'object') {
            try {
                let d = rFD(5);
                return d.trim().substring(0, 3) + btoa(JSON.stringify(v)) + d.trim().slice(3);
            } catch (error) { };
        } else {
            return;
        }
    } catch (error) { };
}

var dataToRepresent = {}, representNotificationData = {};
var definedRules = [];
var rulesMethod = {};

const respondToServer = function (_payload, messageId, isConversion, smartCode) {
    let isConversionValue;
    let smartCodeValue;
    if (typeof isConversion == "string" && typeof smartCode == "string") {
        isConversionValue = isConversion;
        smartCodeValue = smartCode;
    } else {
        isConversionValue = "false";
        smartCodeValue = "";
    }
    var retryCount = 0;
    Promise.all([getIDB('Res_Passport_Id'), getIDB('Res_Profile_Id'), getIDB('_tenantId')]).then(res => {
        let payload = {
            ..._payload,
            id: messageId,
            passportId: res[0] || '',
            profileID: res[1] || '',
            tenantId: res[2] || '',
            domainName: self.registration.scope,
            status: _payload.status_code,
            isConversion: isConversionValue,
            smartCode: smartCodeValue
        }
        let option = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
            body: sD(payload)
        }
        getBaseUrl(campaignTracking).then(data => {
            const postData = (data, option) => fetch(data, option).then(res => res.json()).then(res => {

                try {
                    if (typeof res.data == "string") {
                        res = JSON.parse(gD(res.data));
                    }
                } catch (error) { }

                if (res && !res.status && retryCount < 5) {
                    setTimeout(() => {
                        postData(data, option);
                        retryCount++;
                    }, 1500);
                }
            }).catch(err => {

                self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                    clients[0].postMessage({
                        eventName: "Res_webCampaignTrackingError",
                        error: "firebase-messaging-sw-input.js: " + err.toString(),
                        version: self.ReWebSDK.build.version
                    });
                })

            })
            postData(data, option);
        })

    });
};

var actions = '', clientInfo = null, button_actions = [],
    showInAppNotification = "false", notification_id = null, pass_id = '';
var fcm_senderId = '';
var msgId = null;
var queuedmsg = [], db, passTimer = null;

function osfunction() {
    try {
        let os = navigator.userAgent;
        let finalOs = "";

        if (os.search('Windows') !== -1) {
            finalOs = "Windows";
        }
        else if (os.search('Mac') !== -1) {
            finalOs = "MacOS";
        }
        else if (os.search('X11') !== -1 && !(os.search('Linux') !== -1)) {
            finalOs = "UNIX";
        }
        else if (os.search('Linux') !== -1 && os.search('X11') !== -1) {
            finalOs = "Linux"
        }
        return finalOs
    } catch (error) { };
}

var encryptData = {

    encrypt: (data) => {
        try {
            const encodedWord = enc.Utf8.parse(data);
            const encoded = enc.Base64.stringify(encodedWord);
            return encoded;
        } catch (error) {
            return btoa(data);
        }
    },

    decrypt: (data) => {
        try {
            const encodedWord = enc.Base64.parse(data);
            const decoded = enc.Utf8.stringify(encodedWord);
            return decoded;
        } catch (error) {
            return atob(data);
        }
    }
}

function addIDB(key, value) {
    return new Promise(function (resolve, reject) {
        try {
            let openRequest = indexedDB.open("resuldata", 1);
            openRequest.onsuccess = function () {
                try {
                    db = openRequest.result;
                    try {
                        if (!db.objectStoreNames.contains('Res_Data')) {
                            db.createObjectStore('Res_Data', { keyPath: 'key' });
                        }
                    } catch (e) { }
                    let dbTransaction = db.transaction(["Res_Data"], "readwrite");
                    // var request = dbTransaction.objectStore("Res_Data").put({ key: btoa(key), value: btoa(btoa(JSON.stringify(value))) });
                    var request = dbTransaction.objectStore("Res_Data").put({ key: encryptData.encrypt(key), value: encryptData.encrypt(encryptData.encrypt(JSON.stringify(value))) });
                    request.onsuccess = function (event) {
                        resolve("Added to database.");
                    };
                    request.onerror = function (event) {
                        reject('error: ' + event);
                    }
                } catch (error) { }
            };
        } catch (error) { }
    })
}

function getIDB(key) {
    return new Promise(function (resolve, reject) {
        try {
            let openRequest = indexedDB.open("resuldata", 1);
            openRequest.onsuccess = function () {
                try {
                    db = openRequest.result;
                    try {
                        if (!db.objectStoreNames.contains('Res_Data')) {
                            db.createObjectStore('Res_Data', { keyPath: 'key' });
                        }
                    } catch (e) { }
                    let dbTransaction = db.transaction(["Res_Data"], "readwrite");
                    var objectStore = dbTransaction.objectStore("Res_Data");
                    // var objectStoreRequest = objectStore.get(btoa(key));
                    var objectStoreRequest = objectStore.get(encryptData.encrypt(key));
                    objectStoreRequest.onsuccess = function (event) {
                        let res = objectStoreRequest.result;
                        if (!!res && res.value) {
                            try {
                                // res.value = JSON.parse(atob(atob(res.value)));
                                res.value = JSON.parse(encryptData.decrypt(encryptData.decrypt(res.value)));
                                resolve(res.value);
                            } catch (err) {
                                reject(err);
                            }
                        } else {
                            reject('Not found');
                        }
                    }
                    objectStoreRequest.onerror = function (err) {
                        reject(err);
                    }
                } catch (error) {
                    reject(error);
                }
            };
        } catch (error) {
            reject(error);
        }
    });
}
var _client = null;
addEventListener('fetch', event => {
    event.waitUntil(function () {
        if (!event.clientId) {
            return;
        };
        clients.get(event.clientId).then(client => {
            if (!client) {
                return;
            }
            _client = client;
            // if (showInAppNotification == "true") {
            //     client.postMessage({
            //         msg: representNotificationData
            //     });
            //     self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
            //         if (clients && clients.length) {
            //             clients[0].postMessage({ msg: representNotificationData });
            //         }
            //     });
            // }
            if (!!pass_id) {
                client.postMessage({ pass_id: pass_id });
            }
        })

    }());
});

self.addEventListener('install', function (event) {
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(self.clients.claim());
    setInterval(RetryFailureNotification, 15000)
});

self.addEventListener("push", (event) => {

    event.waitUntil(handlePush(event));
})

function storeNotifications(payload) {
    try {
        getIDB('ResNotification').then(r => {
            if (r.length > 14) {
                r.shift();
                r.push(payload)
            } else {
                r.push(payload)
            }
            addIDB('ResNotification', r);
        }, er => {
            addIDB('ResNotification', [payload]);
        });
    } catch (err) { }
}

async function handlePush(event) {
    try {
        let payload = event.data.json();
        dataforlater = payload;

        storeNotifications(payload);

        if ('data' in payload) {

            let response = await validatePayload(dataforlater);
            return response;

        } else {

            initAnalyticsCustomEvent({
                eventName: "Res_SW_Error",
                error: "SW file: data is not present in payload",
                swVersion: ReWebSDK.build.version || ""
            })
            return Promise.resolve();

        }
    } catch (error) {

        initAnalyticsCustomEvent({
            eventName: "Res_SW_Error",
            error: "SW file: " + error.toString(),
            swVersion: ReWebSDK.build.version || ""
        })
        return Promise.resolve();

    }
}

async function validatePayload(payload) {
    try {
        if (!!payload.data && payload.data.resul) {
            payload.data = JSON.parse(atob(payload.data.resul.substring(4)))
            if (!!payload.data.resul) {
                payload.data = JSON.parse(atob(payload.data.resul.substring(4)));
            }
            payload.data.options = JSON.stringify(payload.data.options)
        }

        if (!!payload.data && !!payload.data.ttl && payload.data.ttl == "0001-01-01T00:00:00") {
            payload.data.ttl = '';
            initAnalyticsCustomEvent({
                eventName: "Res_SW_Error",
                error: "SW file: Not valid ttl in payload",
                swVersion: ReWebSDK.build.version || ""
            })
        }

        if (!!payload.data && !!payload.data.ttl) {
            const notificationExpiryDate = payload.data.ttl;
            const utc_date = new Date(new Date().toUTCString()).toISOString().split(".")[0];
            if (new Date(utc_date) >= new Date(notificationExpiryDate)) {
                console.log('notification expired!', payload);
                var option = {
                    action: 'expired',
                    status_code: '1'
                }
                initAnalyticsCustomEvent({
                    eventName: "Res_SW_Error",
                    error: "SW file: notification expired",
                    swVersion: ReWebSDK.build.version || ""
                })
                return Promise.resolve();
            }
        }

        if ((("IsCarousel" in payload.data) || ("inAppNotification" in payload.data)) && ((payload.data.inAppNotification == "true" || payload.data.inAppNotification == true) || (payload.data.IsCarousel == "true" || payload.data.IsCarousel == true))) {
            try {

                if (browserName == "Chrome" || browserName == "Edge") {

                    let response = await initAlertNotification(payload);
                    return response;

                } else {

                    let response = await initInAppNotification(payload);
                    return response;

                }

            } catch (error) {

                initAnalyticsCustomEvent({
                    eventName: "Res_SW_Error",
                    error: "SW file -> validatePayload -> condition: " + error.toString(),
                    swVersion: ReWebSDK.build.version || ""
                })
                return Promise.resolve();
            }

        } else {
            let response = await initAlertNotification(payload);
            return response;
        }

    } catch (error) {

        initAnalyticsCustomEvent({
            eventName: "Res_SW_Error",
            error: "SW file -> validatePayload: " + error.toString(),
            swVersion: ReWebSDK.build.version || ""
        })
        return Promise.resolve();

    }
}

async function initInAppNotification(payload) {
    try {

        let clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })

        if (!!clients && clients[0].visibilityState == "visible") {

            clients[0].postMessage({ msg: payload.data });
            return Promise.resolve();

        } else {

            let response = await initAlertNotification(payload);
            return response;

        }

    } catch (error) {

        let response = await initAlertNotification(payload);
        return response;

    }
}

async function initAlertNotification(payload) {
    try {
        const notificationOptions = JSON.parse(payload.data.options);
        notificationOptions['tag'] = payload.data.id;
        if (notificationOptions.type == "image") {
            notificationOptions["image"] = notificationOptions.url;
        }
        button_actions = notificationOptions.actions;
        const notificationTitle = payload.data.title;
        notificationOptions["data"] = {
            showInAppNotification: payload.data.inAppNotification,
            representNotificationData: payload.data
        };
        var option = {
            action: 'received',
            status_code: '5'
        };
        msgId = payload.data.id;
        respondToServer(option, payload.data.id);

        try {
            if (osfunction() == "MacOS") {
                delete notificationOptions.requireInteraction;
            }
        } catch (error) { };

        let response = await self.registration.showNotification(notificationTitle, notificationOptions);
        return response;

    } catch (error) {

        initAnalyticsCustomEvent({
            eventName: "Res_SW_Error",
            error: "SW file -> initAlertNotification: " + error.toString(),
            swVersion: ReWebSDK.build.version || ""
        })
        return Promise.resolve();

    }
}


self.onnotificationclose = (event) => {
    try {
        const clickedNotification = event.notification;
        let messageId = clickedNotification.tag;
        const option = {
            action: 'dismiss',
            status_code: '3'
        };
        respondToServer(option, messageId);
    } catch (e) { }
}

self.onnotificationclick = (event) => {
    const clickedNotification = event.notification;
    let messageId = clickedNotification.tag;
    clickedNotification.close();
    if (!!event.notification.data) {
        const eventBgdata = event.notification.data.representNotificationData;
        if (!!eventBgdata) {
            actions = eventBgdata.click_actions
        }
        if (event.notification.data.showInAppNotification === 'true') {
            showInAppNotification = event.notification.data.showInAppNotification;
            representNotificationData = event.notification.data.representNotificationData;
        }
    }

    var option = {};
    if (!!event.notification.data && !!event.notification.data.FCM_MSG) {
        actions = event.notification.data.FCM_MSG.notification.click_action;
        if (!(!!actions)) {
            actions = self.location.origin;
        }
        clients.openWindow(actions).then((windowClient) => {

        });
        return false;
    }
    if (!button_actions) {
        button_actions = event.notification.actions;
    }
    if (!!button_actions && button_actions.length > 0) {
        button_actions = event.notification.actions;
    }
    if (!!event.notification.data && event.notification.data.showInAppNotification === 'false') {
        if (!!event.notification.data.actions) {
            button_actions = event.notification.data.actions;
        }
        if (!!event.notification.data.representNotificationData) {
            try {
                const _bgdata = event.notification.data.representNotificationData.data;
                let _bgaction;
                if (typeof _bgdata == "string") {
                    _bgaction = JSON.parse(_bgdata).actions;
                } else {
                    _bgaction = _bgdata.actions;
                }
                // const _bgaction = JSON.parse(_bgdata).actions;
                button_actions = _bgaction;
            } catch (error) { }
        }
    }
    if (Object.keys(rulesMethod).includes('notificationClick')) {
        rulesMethod.notificationClick();
    }
    switch (event.action) {
        case '':
            option = {
                action: 'opened',
                status_code: '2'
            }
            if (!(!!actions)) {
                actions = self.location.origin;
            }
            clients.openWindow(actions).then((windowClient) => {

            });

            if (Object.keys(rulesMethod).includes('notificationViewClick')) {
                rulesMethod.notificationViewClick();
            }
            break;
        case undefined:
            option = {
                action: 'opened',
                status_code: '2'
            }
            if (!(!!actions)) {
                actions = self.location.origin;
            }
            clients.openWindow(actions).then((windowClient) => {

            });

            if (Object.keys(rulesMethod).includes('notificationViewClick')) {
                rulesMethod.notificationViewClick();
            }
            break;
        case 'later':
            let laterObj = button_actions.filter(actions => actions.action == event.action)[0];
            option = {
                action: event.action,
                status_code: '4'
            }
            setTimeout(() => {
                var _data = null;
                if (!Object.keys(dataToRepresent).length) {
                    // showBgNotification(dataforlater);
                    validatePayload(dataforlater);
                } else {
                    _data = dataToRepresent
                    representNotification(_data);
                }
            }, laterObj.duration);
            if (Object.keys(rulesMethod).includes('notificationLaterClick')) {
                rulesMethod.notificationLaterClick();
            }

            break;

        case 'dismiss':
            option = {
                action: event.action,
                status_code: '3'
            }
            if (Object.keys(rulesMethod).includes('notificationDismissClick')) {
                rulesMethod.notificationDismissClick();
            }

            break;

        default: {
            let customObj = button_actions.filter(actions => actions.action == event.action)[0];
            var option = {
                action: event.action,
                status_code: customObj.actionId
            }
            let url = customObj.actionUrl || '';
            if (!(!!url)) {
                url = self.location.origin;
            }
            clients.openWindow(url).then(function (windowClient) {

            });
        }
            break;
    };

    // if(showInAppNotification != "true") {
    respondToServer(option, messageId);
    // }

};


function messageListenerTriggered(data) {
    try {
        let mainWindow = null;
        try {
            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                mainWindow = clients;

            })
        } catch (error) { }
        if ('event' in data.data) {
            switch (data.data.event) {
                case "ping":
                    try {
                        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                            if (clients && clients.length) {
                                clients[0].postMessage({ ping: "success" });
                            }
                        });
                    } catch (error) { }
                    break;

                case "inAppUpdate":
                    try {
                        if (!!data.data.browserName) {
                            browserName = data.data.browserName;
                        }
                        if (showInAppNotification == "true" && !!representNotificationData) {
                            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                                if (clients && clients.length) {
                                    clients[0].postMessage({ msg: representNotificationData });
                                }
                            }).catch(err => { })
                        }
                    } catch (error) { }
                    break;

                case "customEventTest":
                    try {
                        const option = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(data.data.payload || data.data.data)
                        }
                        fetch("https://sdklb13.resu.io/Campaign/customeventstest", option).then(res => {
                            res.json().then(res => {/*//console.log(res)*/ })
                        }).catch(err => { })
                    } catch (error) { }
                    break;

                case "resu_post":
                    try {
                        const option = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                            body: sD(data.data.data.payload)
                        }
                        fetch(data.data.data.url, option).then(res => res.json()).then(res => {/*//console.log(res)*/ });
                    } catch (error) { }
                    break;

                case "customEvent":
                    try {
                        Promise.all([getIDB('Res_Passport_Id'), getIDB('Res_Profile_Id'), getIDB('_tenantId'), getIDB('deviceId')]).then(res => {
                            try {
                                const payload = {
                                    ...data.data.payload,
                                    passportId: res[0] || '',
                                    profileID: res[1] || '',
                                    tenantId: res[2] || '',
                                    deviceId: res[3] || ''
                                }
                                const option = {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                                    body: sD(payload)
                                }

                                getBaseUrl(Custom_Events).then(apiUrl => {
                                    let apiRandId = Date.now();
                                    AddFailureApiDataToIndexDBSw(apiUrl, payload, apiRandId, "customEventsClientSw")
                                    fetch(apiUrl, option).then(res => {
                                        if (res.ok) {
                                            RemoveFailureApiDataFromIndexDBSw(apiRandId)
                                            // return res.json();
                                            res.json().then(res => {
                                                try {
                                                    if (typeof res.data == "string") {
                                                        return JSON.parse(gD(res.data));
                                                    } else {
                                                        return res;
                                                    }
                                                } catch (error) { }
                                            })
                                        }
                                    }).then(res => { });
                                })
                            } catch (error) { }
                        }).catch(err => { });
                    } catch (error) { }
                    break;

                case "userRegisterEvent":
                    try {
                        const option = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                            body: sD(data.data.payload)
                        }

                        getBaseUrl(User_Register).then(apiUrl => {

                            fetch(apiUrl, option).then(res => {
                                res.json().then(res => {

                                    try {
                                        if (typeof res.data == "string") {
                                            res = JSON.parse(gD(res.data));
                                        }
                                    } catch (error) { }

                                    if (res.data != 'success' && !!res.data) {
                                        pass_id = res.data
                                        passTimer = setInterval(() => {
                                            try {
                                                self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                                                    if (clients && clients.length) {
                                                        clients[0].postMessage({ pass_id: pass_id });
                                                    }
                                                });
                                            } catch (error) {

                                            }
                                        }, 2000);
                                        setTimeout(() => {
                                            clearInterval(passTimer)
                                        }, 20000);
                                    }
                                }).catch(err => {

                                    self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {

                                        clients[0].postMessage({
                                            eventName: "Res_UserRegisterError",
                                            error: err.toString(),
                                            version: self.ReWebSDK.build.version
                                        });

                                    })

                                })
                            }).catch(err => {

                                self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {

                                    clients[0].postMessage({
                                        eventName: "Res_UserRegisterError",
                                        error: err.toString(),
                                        version: self.ReWebSDK.build.version
                                    });

                                })

                            })

                        }).catch(err => {

                            self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {

                                clients[0].postMessage({
                                    eventName: "Res_UserRegisterError",
                                    error: err.toString(),
                                    version: self.ReWebSDK.build.version
                                });

                            })

                        });

                    } catch (error) {

                        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {

                            clients[0].postMessage({
                                eventName: "Res_UserRegisterError",
                                error: error.toString(),
                                version: self.ReWebSDK.build.version
                            });

                        })

                    }
                    break;

                case "userJourney":
                    try {
                        const option = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                            body: sD(data.data.payload)
                        }
                        getBaseUrl(User_Journey).then(apiUrl => {
                            fetch(apiUrl, option).then(res => res.json()).then(res => {/*//console.log(res)*/ });
                        }).catch(err => { })
                    } catch (error) { }
                    break;

                case "webSdkBlastEvent":
                    try {
                        const option = {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                            body: sD(data.data.payload)
                        }
                        const apiUrl = data.data.url;
                        return fetch(apiUrl, option).then(res => res.json()).then(res => {

                            try {
                                if (typeof res.data == "string") {
                                    return JSON.parse(gD(res.data));
                                } else {
                                    return res;
                                }
                            } catch (error) { }

                            // console.log(res); 
                            // return res; 
                        }).catch(err => { });
                    } catch (error) { }
                    break;

                case "customMsgEvent":
                    try {
                        dataToRepresent = data;
                        clientInfo = data.data;
                        notification_id = data.data.data["id"];
                        representNotification(dataToRepresent);
                    } catch (error) { }
                    break;

                case "dismissInapp":
                    try {
                        console.log('dismissInapp tapped');
                        showInAppNotification = "false";
                        representNotificationData = {};
                    } catch (error) { }
                    break;

                case "notificationqueue":
                    try {
                        console.log('notificationqueue', data.data.payload.data);
                        // showBgNotification(data.data.payload);
                        validatePayload(data.data.payload);
                    } catch (error) { }
                    break;

                case "checkSession":
                    try {

                    } catch (error) { }
                    break;

                case "clear_pass_id":
                    try {
                        pass_id = '';
                        clearInterval(passTimer)
                    } catch (error) { }
                    break;

                case "dismiss_TBN":
                    try {
                        self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(function (clients) {
                            if (clients && clients.length) {
                                clients[0].postMessage({ event: 'dismiss_TBN_tapped' });
                                mainWindow[0].postMessage({ event: 'dismiss_TBN_tapped' });
                            }
                        }).catch(err => { });
                    } catch (error) { }
                    break;

                case "lastEvent":
                    try {
                        if (data.data.data) {
                            Promise.all([getIDB('Res_Passport_Id'), getIDB('Res_Profile_Id'), getIDB('_tenantId'), getIDB('deviceId'),
                            getIDB('domainName'), getIDB('sessionId')]).then(res => {
                                let commonPayloadData = res;
                                try {
                                    let tenantID = commonPayloadData[2] || ''
                                    if (tenantID == "bb073c1c_0589_4bc3_bb5d_eaf9ef5364e5" && data.data.data != "Appointment Booked") {
                                        let dropOff = data.data.data + "_drop_off";
                                        Promise.all([getIDB('u_email'), getIDB('u_phoneNumber')]).then(res => {
                                            if (!!res) {
                                                let payload = {
                                                    eventTime: new Date(new Date().toUTCString()).toISOString().split(".")[0],
                                                    eventName: dropOff,
                                                    passportId: commonPayloadData[0] || '',
                                                    profileID: commonPayloadData[1] || '',
                                                    tenantId: commonPayloadData[2] || '',
                                                    deviceId: commonPayloadData[3] || '',
                                                    domainName: commonPayloadData[4] || '',
                                                    sessionId: commonPayloadData[5] || '',
                                                    data: {
                                                        u_email: res[0] || '',
                                                        u_phoneNumber: res[1] || ''
                                                    }
                                                }


                                                const option = {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                                                    body: sD(payload)
                                                }

                                                let apiPayload = {
                                                    ...option,
                                                    "time": new Date().toString()
                                                }

                                                getBaseUrl(Custom_Events).then(apiUrl => {
                                                    let apiRandId = Date.now();
                                                    AddFailureApiDataToIndexDBSw(apiUrl, payload, apiRandId, "dropOffDataSw")
                                                    fetch(apiUrl, option).then(res => {
                                                        if (res.ok) {
                                                            addIDB("lastEventSuccess", JSON.stringify(apiPayload));
                                                            RemoveFailureApiDataFromIndexDBSw(apiRandId);
                                                            // return res.json();
                                                            res.json().then(res => {
                                                                try {
                                                                    if (typeof res.data == "string") {
                                                                        return JSON.parse(gD(res.data));
                                                                    } else {
                                                                        return res;
                                                                    }
                                                                } catch (error) { }
                                                            })
                                                        }
                                                    }).then(res => {/*//console.log(res)*/ }).catch((error) => {
                                                        addIDB("lastEventFailed", JSON.stringify(apiPayload))
                                                    });
                                                }).catch((err) => { });
                                            } else {
                                                let payload = {
                                                    eventTime: new Date(new Date().toUTCString()).toISOString().split(".")[0],
                                                    eventName: dropOff,
                                                    passportId: commonPayloadData[0] || '',
                                                    profileID: commonPayloadData[1] || '',
                                                    tenantId: commonPayloadData[2] || '',
                                                    deviceId: commonPayloadData[3] || '',
                                                    domainName: commonPayloadData[4] || '',
                                                    sessionId: commonPayloadData[5] || '',
                                                    data: {
                                                        u_email: '',
                                                        u_phoneNumber: ''
                                                    }
                                                }

                                                const option = {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                                                    body: sD(payload)
                                                }

                                                let apiPayload = {
                                                    ...option,
                                                    "time": new Date().toString()
                                                }

                                                getBaseUrl(Custom_Events).then(apiUrl => {
                                                    let apiRandId = Date.now();
                                                    AddFailureApiDataToIndexDBSw(apiUrl, payload, apiRandId, "dropOffDataSw")
                                                    fetch(apiUrl, option).then(res => {
                                                        if (res.ok) {
                                                            addIDB("lastEventSuccess", JSON.stringify(apiPayload));
                                                            RemoveFailureApiDataFromIndexDBSw(apiRandId);
                                                            // return res.json();
                                                            res.json.then(res => {
                                                                try {
                                                                    if (typeof res.data == "string") {
                                                                        return JSON.parse(gD(res.data));
                                                                    } else {
                                                                        return res;
                                                                    }
                                                                } catch (error) { }
                                                            })
                                                        }
                                                    }).then(res => { }).catch((error) => {
                                                        addIDB("lastEventFailed", JSON.stringify(apiPayload))
                                                    });
                                                }).catch((err) => { });
                                            }

                                        }).catch(err => {
                                            let payload = {
                                                eventTime: new Date(new Date().toUTCString()).toISOString().split(".")[0],
                                                eventName: dropOff,
                                                passportId: commonPayloadData[0] || '',
                                                profileID: commonPayloadData[1] || '',
                                                tenantId: commonPayloadData[2] || '',
                                                deviceId: commonPayloadData[3] || '',
                                                domainName: commonPayloadData[4] || '',
                                                sessionId: commonPayloadData[5] || '',
                                                data: {
                                                    u_email: '',
                                                    u_phoneNumber: ''
                                                }
                                            }

                                            const option = {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                                                body: sD(payload)
                                            }

                                            let apiPayload = {
                                                ...option,
                                                "time": new Date().toString()
                                            }

                                            getBaseUrl(Custom_Events).then(apiUrl => {
                                                let apiRandId = Date.now();
                                                AddFailureApiDataToIndexDBSw(apiUrl, payload, apiRandId, "dropOffDataSw")
                                                fetch(apiUrl, option).then(res => {
                                                    if (res.ok) {
                                                        addIDB("lastEventSuccess", JSON.stringify(apiPayload));
                                                        RemoveFailureApiDataFromIndexDBSw(apiRandId);
                                                        // return res.json();
                                                        res.json().then(res => {
                                                            try {
                                                                if (typeof res.data == "string") {
                                                                    return JSON.parse(gD(res.data));
                                                                } else {
                                                                    return res;
                                                                }
                                                            } catch (error) { }
                                                        })
                                                    }
                                                }).then(res => { }).catch((error) => {
                                                    addIDB("lastEventFailed", JSON.stringify(apiPayload))
                                                });
                                            }).catch((err) => { });
                                        });
                                    }
                                } catch (error) { };
                            }).catch(err => { });
                        }
                    } catch (error) { }
                    break;
            }
        }
    } catch (error) { }
}

self.addEventListener('message', messageListenerTriggered);


const representNotification = (data) => {
    const title = data.data.data.title;
    let options = { body: data.data.data.body, ...JSON.parse(data.data.data.options) };
    msgId = data.data.data.id;
    button_actions = options.actions;
    actions = "click_actions" in data.data.data ? data.data.data.click_actions : data.data.data.click_action;
    const notificationExpiryDate = data.data.data.ttl;
    console.log(notificationExpiryDate);
    checkExpired(title, options, notificationExpiryDate, msgId, actions)
}

function checkExpired(title, options, notificationExpiryDate, msgId, actions) {
    const utc_date = new Date(new Date().toUTCString()).toISOString().split(".")[0];
    if (!!notificationExpiryDate && (new Date(utc_date) >= new Date(notificationExpiryDate))) {
        console.log('Notification Expired');
        var option = {
            action: 'expired',
            status_code: '1'
        }
    } else {
        presentNotification(title, options, actions, msgId);
        var option = {
            action: 'received',
            status_code: '5'
        }
        respondToServer(option, msgId);
    }
}

function presentNotification(title, options, actions, msgId) {
    options["tag"] = msgId;
    options["data"] = options;
    options["showInAppNotification"] = "false";
    try {
        if (osfunction() == "MacOS") {
            delete options.requireInteraction;
        }
    } catch (error) { };
    self.registration.showNotification(title, options);
}


var dataforlater = null;
if (self.location.origin.includes("utimf")) {
    try {
        importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase.js');
        importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-app.js');
        importScripts('https://www.gstatic.com/firebasejs/5.5.2/firebase-messaging.js');

        firebase.initializeApp({ "messagingSenderId": "537523308807" });
        const messaging = firebase.messaging();
        messaging.setBackgroundMessageHandler(function (payload) {
            dataforlater = payload;
            function storeNotifications(payload) {
                try {
                    getIDB('ResNotification').then(r => {
                        if (r.length > 14) {
                            r.shift();
                            r.push(payload)
                        } else {
                            r.push(payload)
                        }
                        addIDB('ResNotification', r);
                    }, er => {
                        addIDB('ResNotification', [payload]);
                    });
                } catch (err) { }
            }
            storeNotifications(payload);
            if ('data' in payload) {
                // return showBgNotification(dataforlater);
                return validatePayload(dataforlater);
            } else {
                return new Promise(function (res, rej) { });
            }
        });
    } catch (error) { };

} else {
    getIDB("pushConfig").then(res => {
        const app = initializeApp(gD(res));
        const messaging = getMessaging(app);

    }).catch(err => { });
}

function create_UUID() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

function initAnalyticsCustomEvent(eventData) {
    try {
        Promise.all([
            getIDB('Res_Passport_Id'),
            getIDB('Res_Profile_Id'),
            getIDB('_tenantId'),
            getIDB('deviceId'),
            getIDB('domainName'),
            getIDB('sessionId')
        ]).then(res => {
            try {

                const payload = {
                    eventName: eventData.eventName || "",
                    data: {
                        error: eventData.error || "",
                        swVersion: eventData.swVersion || "",
                    },
                    passportId: res[0] || '',
                    profileID: res[1] || '',
                    tenantId: res[2] || '',
                    deviceId: res[3] || '',
                    eventTime: new Date(new Date().toUTCString()).toISOString().split(".")[0],
                    eventId: create_UUID(),
                    pageUrl: self.location.origin,
                    domainName: res[4] || '',
                    sessionId: res[5] || '',
                    uniqueId: ""
                }

                const option = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'IsEncryption': true },
                    body: sD(payload)
                }

                getBaseUrl(Custom_Events).then(apiUrl => {
                    let apiRandId = Date.now();
                    AddFailureApiDataToIndexDBSw(apiUrl, payload, apiRandId, "customEventsClientSw")
                    fetch(apiUrl, option).then(res => {
                        if (res.ok) {
                            RemoveFailureApiDataFromIndexDBSw(apiRandId)
                            // return res.json();
                            res.json().then(res => {
                                try {
                                    if (typeof res.data == "string") {
                                        return JSON.parse(gD(res.data));
                                    } else {
                                        return res;
                                    }
                                } catch (error) { }
                            })
                        }
                    }).then(res => { });
                })
            } catch (error) { }
        }).catch(err => { });
    } catch (error) { }
}

function RetryFailureNotification() {
    getIDB("Res_Sdk_Failure_Api_List").then(res => {
        console.log(res)
        if (res && res.length) {
            console.log("Res_Sdk_Failure_Api_List:" + JSON.stringify(res))
            let currentApiData = [...res];

            const groups = currentApiData.reduce((groups, item) => {
                const group = (groups[item.apiName] || []);
                group.push(item);
                groups[item.apiName] = group;
                return groups;
            }, {});
            let clicks = [];
            let events = [];
            let payload = {};
            let rowIdList = [];
            let option = {};
            let apiUrl = "";
            Object.keys(groups).forEach(item => {
                groups[item].forEach(apiItem => {
                    const { rowId, url, bodyContent: { action, status_code, id, passportId, profileID, tenantId, domainName, status, deviceId, eventName, pageUrl, sessionId }, apiName } = apiItem;
                    const { bodyContent } = apiItem;
                    if (apiName == "inAppNotificationTracking") {
                        clicks = [...clicks, { action, id, status }];
                        payload = { passportId, profileID, tenantId, domainName, clicks };
                    }
                    // else if (apiName == "custEvent") {
                    //     events = [...events, { eventName, pageUrl, sessionId, domainName }];
                    //     payload = { passportId, profileID, tenantId, domainName, deviceId, events };
                    // } 
                    else {
                        payload = bodyContent;
                    }
                    rowIdList = [...rowIdList, rowId];
                    apiUrl = url;
                })
                option = {
                    method: 'POST',
                    headers: { 'IsEncryption': true },
                    body: sD(payload)
                }

                fetch(apiUrl, option).then(res => { return res.json(); }).then(res => {

                    try {
                        if (typeof res.data == "string") {
                            res = JSON.parse(gD(res.data));
                        }
                    } catch (error) { }

                    if (res.status == true) {
                        let updateDataToDb = currentApiData.filter(deleteItem => !rowIdList.includes(deleteItem.rowId))
                        addIDB("Res_Sdk_Failure_Api_List", updateDataToDb);
                    }
                }).catch(err => {
                    console.log("addDBErr", err)
                })
            })

        } else {
            console.log("api-retry-sw-data-not-found")
        }
    }).catch(err => {
        console.log("api-retry-sw-err", err)
    })
}

// function console.log(key, value = '') {
//     getIDB("swDebugEnable").then(res => {

//         if (res == true) {
//             console.log("swdebug enabled")
//             console.log(`${key} ::: ${value}`)
//         }
//     }).catch(err => { })
// }

function AddFailureApiDataToIndexDBSw(url, apiContent, apiRandId, type) {
    getIDB("Res_Sdk_Failure_Api_List").then(res => {
        if (res && res.length) {
            let currentApiData = [{ rowId: apiRandId, url: url, bodyContent: apiContent, status: true, apiName: type }];
            currentApiData = [...currentApiData, ...res];
            addIDB("Res_Sdk_Failure_Api_List", currentApiData);
            console.log("Res_Sdk_Failure_Api_List:" + JSON.stringify(currentApiData))
        }
    }).catch(err => {
        let currentApiData = [{ rowId: apiRandId, url: url, bodyContent: apiContent, status: true, apiName: type }];
        addIDB("Res_Sdk_Failure_Api_List", currentApiData);
        console.log("Res_Sdk_Failure_Api_List:" + JSON.stringify(currentApiData))
    })
}

function RemoveFailureApiDataFromIndexDBSw(apiRandId) {
    getIDB("Res_Sdk_Failure_Api_List").then(res => {
        if (res && res.length) {
            console.log("Res_Sdk_Failure_Api_List:" + JSON.stringify(res))
            let currentApiData = [...res];
            currentApiData = currentApiData.filter(item => item.rowId !== apiRandId)
            addIDB("Res_Sdk_Failure_Api_List", currentApiData);
        }
    }).catch(err => {
        console.log('Res_Sdk_Failure_Api_List: not found id:' + apiRandId)
    })
}
