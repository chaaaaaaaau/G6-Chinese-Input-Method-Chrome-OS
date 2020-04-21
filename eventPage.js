chrome.contextMenus.create({
    "id": "wordDictionary",
    "title": "Search in Word Dictionary",
    "contexts": ["selection"]});
    
chrome.contextMenus.create({
    "id": "addToMyFav",
    "title": "Add to My Favourite Collection",
    "contexts": ["selection"]});


chrome.contextMenus.onClicked.addListener(function(clickData){   
    
    var tableHeader = "<tr><th>Word/Phrase</th><th>Code</th></tr>";
    var tableHTML = "<tr><th>Word/Phrase</th><th>Code</th></tr>";
    // Get 
    chrome.storage.sync.get(['wD_searchHistory_html'],function(record) {
    if (record.wD_searchHistory_html) {
        console.log("****** Table HTML found ****** There is existing WD record.")
        console.log(record.wD_searchHistory_html)
        tableHTML = record.wD_searchHistory_html;
    }
    });
    
    var tableHeader_mF = "<tr><th>Word/Phrase</th> <th>Code</th><th>T/S</th><th>Delete</th></tr>"
    var tableHTML_mF = "<tr><th>Word/Phrase</th> <th>Code</th><th>T/S</th><th>Delete</th></tr>"
    
    chrome.storage.sync.get(['mF_collection_html'],function(record) {
    if (record.mF_collection_html) {
        console.log("****** Table HTML found ****** There is existing MF record.")
        console.log(record.mF_collection_html)
        tableHTML_mF = record.mF_collection_html;
    }
    });
    
    console.log("testing point 1")
    
    if (clickData.menuItemId == "wordDictionary" && clickData.selectionText){    
        //if (isInt(clickData.selectionText)){      
        console.log("testing point 2")
        chrome.storage.sync.get(['wordToSearch'], function(){
            var input = clickData.selectionText; 
            if (input) {
                console.log("****** Received Input For Word Dictionary. Input = ", input, " ******");
                // SQL Execution
                var stroke = "";
   
                var table_find_word = 'G6TC';
                if (input.length == 2) {
                    table_find_word = 'G6T2P';
                }
                if (input.length == 3) {
                    table_find_word = 'G6T3P';
                }
                if (input.length > 3) {
                    table_find_word = 'G6TMP';
                }
 
                try {
                    for (var i = 0; i < 6; i++) {
                        var sql_find_word = "SELECT Code".concat(i).concat(" FROM ");
                        sql_find_word = sql_find_word.concat(table_find_word).concat(" WHERE Character = '");
                        sql_find_word = sql_find_word.concat(input).concat("';");
                        console.log(sql_find_word);
                        var contents = chrome.extension.getBackgroundPage().g6database.exec(sql_find_word);
                        console.log(contents[0].values[0]);
                        if (contents[0].values[0].toString() !== "") {
                            stroke = stroke + contents[0].values[0].toString();
                        } else {
                            break;
                        }
                    }
                    //
                    var notifOptions = {
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'Word Dictionary',
                    message: input+"："+stroke,
                    priority: 2
                    };
                    chrome.notifications.create('Word Dictionary',notifOptions);
                    setTimeout(function() {
                        chrome.notifications.clear('Word Dictionary');
                    }, 3000);
                    console.log("testing point 3")
                    var newRecordHTML = "<tr><td>"+ input +"</td><td>" + stroke + "</td></tr>"
                    console.log("new Record HTML: " + newRecordHTML);
                    tableHTML = tableHeader.concat(newRecordHTML).concat(tableHTML.split(tableHeader).pop()) 
                    
                    chrome.storage.sync.set({'wD_searchHistory_html':tableHTML}, function(){
                            console.log(" ****** Updated Word Dictionary Search History HTML Saved ******");
                    });
                
                } catch (e) { // Invalid input for database
                    console.log("error find: " + e)
                    var notifOptions = {
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'Word Dictionary',
                    message: "Invalid Input: Please select existing Chinese word/phrases and try again!",
                    priority: 2
                    };
                    chrome.notifications.create('Word Dictionary',notifOptions);
                    setTimeout(function() {
                        chrome.notifications.clear('Word Dictionary');
                    }, 3000);
                }
            }
        });
    } // End for Word Dictionary
    ////////////////////////////
    if (clickData.menuItemId == "addToMyFav" && clickData.selectionText){
        
        chrome.storage.sync.get(['wordToAdd'], function(){
            var input = clickData.selectionText
            if (input) {
                console.log("****** Received Input For My Favourite. Input = ", input, " ******");
                var code = "";
                var valid = true

                var table_myFav = 'G6TC';
                // Data Validation. Check All Character As Only First and Last require for adding. Need Special Handle
                try {
                    for (var i = 0; i < input.length; i++) {
                        var sql_myFav_valid = "SELECT * FROM ".concat(table_myFav).concat(" WHERE Character = '")
                                                .concat(input[i]).concat("';");
                        var contents_valid = chrome.extension.getBackgroundPage().g6database.exec(sql_myFav_valid);
                        // If undefined, error appear in below console. -> Stop Try
                        console.log(contents_valid[0].values[0]);
                    }
                } catch(e) { // Too long to run all code. One more variable
                    valid = false;
                    console.log("error find: " + e)
                    var notifOptions = {
                    type: 'basic',
                    iconUrl: 'icon.png',
                    title: 'My Favourite Collection',
                    message: "Invalid Input: Please select existing Chinese word/phrases and try again!",
                    priority: 2
                    };
                    chrome.notifications.create('My Favourite Collection',notifOptions);
                    setTimeout(function() {
                        chrome.notifications.clear('My Favourite Collection');
                    }, 3000);
                }
                /////////////////////////////////////////////////////////////
                // Duplicate Check
                
                var t = document.createElement("TABLE");
                t.innerHTML = tableHTML_mF;
                for (var i = 1; i < t.rows.length; i++) {
                    row = t.rows[i];
                    if ((row.cells[0].innerHTML == input) && (row.cells[2].innerHTML == table_myFav[2])){
                        valid = false;
                        console.log("error find: duplicate error")
                        var notifOptions = {
                        type: 'basic',
                        iconUrl: 'icon.png',
                        title: 'My Favourite Collection',
                        message: "Duplicate Input: Input is already registered in My Favourite Collection.",
                        priority: 2
                        };
                        chrome.notifications.create('My Favourite Collection',notifOptions);
                        setTimeout(function() {
                            chrome.notifications.clear('My Favourite Collection');
                        }, 3000);
                    }
                }
                
                /////////////////////////////////////////////////////////////
                if (valid) {
                    // SQL Execution
                    // First Character, First Three Strokes
                    for (var i =0; i < 3; i++) {
                        var sql_myFav_1 = "SELECT Code".concat(i).concat(" FROM ").concat(table_myFav).concat(" WHERE Character = '");
                        sql_myFav_1 = sql_myFav_1.concat(input[0]).concat("';");
                        console.log(sql_myFav_1);
                        var contents_1 = chrome.extension.getBackgroundPage().g6database.exec(sql_myFav_1);
                        console.log(contents_1[0].values[0]);
                        if (contents_1[0].values[0].toString() !== "") {
                            code = code + contents_1[0].values[0].toString();
                            } else {
                                break;
                            }
                    }
                    
                    // Last Character, First Three Strokes
                    var sql_myFav_2;
                    var contents_2;
                    if (input.length != 1) { // For G6, Phrases = Head Char 3 Stroke + Tail Char 3 Stroke
                        for (var i = 0; i < 3; i++) {
                            sql_myFav_2 = "SELECT Code".concat(i).concat(" FROM ").concat(table_myFav).concat(" WHERE Character = '");
                            sql_myFav_2 = sql_myFav_2.concat(input[input.length-1]).concat("';");
                            console.log(sql_myFav_2);
                            contents_2 = chrome.extension.getBackgroundPage().g6database.exec(sql_myFav_2);
                            console.log(contents_2[0].values[0]);
                            if (contents_2[0].values[0].toString() !== "") {
                            code = code + contents_2[0].values[0].toString();
                            } else {
                                break;
                            }
                        }
                    } else { // Just One Character
                    // First Character, Last Three Stroke
                        for (var i = 0; i < 3; i++) {
                            sql_myFav_2 = "SELECT Code".concat(i+3).concat(" FROM ").concat(table_myFav).concat(" WHERE Character = '");
                            sql_myFav_2 = sql_myFav_2.concat(input[0]).concat("';");
                            console.log(sql_myFav_2);
                            contents_2 = chrome.extension.getBackgroundPage().g6database.exec(sql_myFav_2);
                            console.log(contents_2[0].values[0]);
                            if (contents_2[0].values[0].toString() !== "") {
                            code = code + contents_2[0].values[0].toString();
                            } else {
                                break;
                            }
                        }
                    }
                    
                    var sql_myFav_3 = "SELECT Favourite From ";

                        if (input.length == 2) {
                            table_myFav = 'G6T2P';
                        }
                        if (input.length == 3) {
                            table_myFav = 'G6T3P';
                        }
                        if (input.length > 3) {
                            table_myFav = 'G6TMP';
                        }
                    
                    sql_myFav_3 = sql_myFav_3.concat(table_myFav).concat(" WHERE Character = '");
                    sql_myFav_3 = sql_myFav_3.concat(input).concat("';");
                    console.log(sql_myFav_3);
                    var contents_3 = chrome.extension.getBackgroundPage().g6database.exec(sql_myFav_3);
                    //console.log(contents_3[0].values[0]);
                    
                    if (contents_3[0] != undefined) { // The Input exists in database, update Value of Favourite
                        if (contents_3[0].values[0].toString() == "0") {
                            console.log(" ****** Update Favoutite for input: ", input, " ******");
                            var sql_update_myFav_1 = "UPDATE ";
                            sql_update_myFav_1 = sql_update_myFav_1.concat(table_myFav);
                            sql_update_myFav_1 = sql_update_myFav_1.concat(" SET Favourite = 1 WHERE Character = '");
                            sql_update_myFav_1 = sql_update_myFav_1.concat(input).concat("';");
                            console.log(sql_update_myFav_1);
                            chrome.extension.getBackgroundPage().g6database.exec(sql_update_myFav_1);
                            console.log(" ****** Updated ******");
                            /////////////////
                            // Exec SQL Again For Updated Detail, and treat it as an object for push.
                            sql_select_myFav_detail = "SELECT * FROM ".concat(table_myFav).concat(" WHERE CHARACTER = '").concat(input).concat("';");
                            var contents_detail = chrome.extension.getBackgroundPage().g6database.exec(sql_select_myFav_detail);
                            var splitContent = contents_detail[0].values[0].toString().split(',');
                            var objMyFav = { 
                                table: table_myFav,
                                //id: splitContent[0],
                                //code0: splitContent[1],
                                //code1: splitContent[2],
                                //code2: splitContent[3],
                                //code3: splitContent[4],
                                //code4: splitContent[5],
                                //code5: splitContent[6],
                                character: splitContent[7],
                                //frequency: splitContent[8],
                                //favourite: splitContent[9]
                            }
                            chrome.extension.getBackgroundPage().updateMyFavList.push(objMyFav);
                            chrome.storage.sync.set({'myFavList_update':chrome.extension.getBackgroundPage().updateMyFavList}, function(){
                                console.log(" ****** Updated My Fav List Saved ******");
                            });
                            //////////////////
                        }
                    } else { // The Input does not exist in database, add it.
                        console.log(" ****** Insert Record for input: ", input, " ******");
                        var id ;
                        var sql_update_myFav_2 = "SELECT COUNT(*) FROM ".concat(table_myFav).concat(";");
                        console.log(sql_update_myFav_2);
                        var contents_4 = chrome.extension.getBackgroundPage().g6database.exec(sql_update_myFav_2);
                        id = parseInt(contents_4[0].values[0].toString());
                        var sql_update_myFav_3 = "INSERT INTO ".concat(table_myFav).concat(" VALUES ('");
                        sql_update_myFav_3 = sql_update_myFav_3.concat(id+1);
                        for (var i = 0; i <code.length; i++) {
                            sql_update_myFav_3 = sql_update_myFav_3.concat("','").concat(code[i]);
                        }
                        for (var i = code.length; i < 6; i++) { // Empty Field but not Undefined For Code Length < 6
                            sql_update_myFav_3 = sql_update_myFav_3.concat("','").concat("");
                        }
                        sql_update_myFav_3 = sql_update_myFav_3.concat("','").concat(input);
                        sql_update_myFav_3 = sql_update_myFav_3.concat("','0','1');");
                        console.log(sql_update_myFav_3);
                        chrome.extension.getBackgroundPage().g6database.exec(sql_update_myFav_3);
                        console.log(" ****** Updated ******");
                            /////////////////
                            // Exec SQL Again For Inserted Detail, and treat it as an object for push.
                            sql_select_myFav_detail = "SELECT * FROM ".concat(table_myFav).concat(" WHERE CHARACTER = '").concat(input).concat("';");
                            var contents_detail = chrome.extension.getBackgroundPage().g6database.exec(sql_select_myFav_detail);
                            var splitContent = contents_detail[0].values[0].toString().split(',');
                            var objMyFav = { 
                                table: table_myFav,
                                id: splitContent[0],
                                code0: splitContent[1],
                                code1: splitContent[2],
                                code2: splitContent[3],
                                code3: splitContent[4],
                                code4: splitContent[5],
                                code5: splitContent[6],
                                character: splitContent[7],
                               // frequency: splitContent[8],
                               //favourite: splitContent[9]
                            }
                            chrome.extension.getBackgroundPage().insertMyFavList.push(objMyFav);
                            chrome.storage.sync.set({'myFavList_insert':chrome.extension.getBackgroundPage().insertMyFavList}, function(){
                                console.log(" ****** Updated My Fav List (Inserted) Saved ******");
                            });
                            //////////////////
                    }
                    
                    //
                    var notifOptions = {
                        type: 'basic',
                        iconUrl: 'icon.png',
                        title: 'My Favourite Collection',
                        message: input + ": " + code,
                        priority: 2
                    };
                    chrome.notifications.create('My Favourite Collection',notifOptions);
                    setTimeout(function() {
                        chrome.notifications.clear('My Favourite Collection');
                    }, 3000);

                    cbHTML = '<input type="checkbox" name="cbForDelete">'

                    var newRecordHTML = "<tr><td>"+ input +"</td><td>" + code + "</td><td>T</td><td>" + cbHTML + "</td></tr>"

                    console.log("new Record HTML: " + newRecordHTML);
                    tableHTML_mF = tableHTML_mF.concat(newRecordHTML);
                    // HTML Add
                    chrome.storage.sync.set({'mF_collection_html':tableHTML_mF}, function(){
                            console.log(" ****** Updated My Favourite Collection HTML Saved ******");
                    });

                } // End of if (valid)
            }
        })
        
    } // End for Add to My Fav
});

