$(function(){
    
    console.log(chrome.extension.getBackgroundPage().g6database); // Connect to G6 Database in background. No need to ajax again. 
    document.getElementById("wordToSearch").addEventListener("keyup", function(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("findWord").click();
        }
    });
    document.getElementById("wordToAdd").addEventListener("keyup", function(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("addToMyFav").click();
        }
    });
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

    
     // Word Dictionary
    $('#findWord').click(function(){
        chrome.storage.sync.get(['wordToSearch'], function(){
            var input = $('#wordToSearch').val(); 
            if (input) {
                console.log("****** Received Input For Word Dictionary. Input = ", input, " ******");
                // SQL Execution
                var stroke = "";
                if (document.getElementById("popupTrad").checked){
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
                }
                else if (document.getElementById("popupSimp").checked) {
                    var table_find_word = 'G6SC';
                    if (input.length == 2) {
                        table_find_word = 'G6S2P';
                    }
                    if (input.length == 3) {
                        table_find_word = 'G6S3P';
                    }
                    if (input.length > 3) {
                        table_find_word = 'G6SMP';
                    }
                }
                    
                try {
                    $('#wD_errorMsg').text('');
                    $('#mF_errorMsg').text('')
                    $('#wordToSearch').val('');  
                    $('#msgAdd').text('');
                    $('#wordToAdd').val('')
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
                    $('#tStroke').text(input + ": "+ stroke);
                    $('#wordToSearch').val('');  
                    
                    var newRecordHTML = "<tr><td>"+ input +"</td><td>" + stroke + "</td></tr>"
                    console.log("new Record HTML: " + newRecordHTML);
                    tableHTML = tableHeader.concat(newRecordHTML).concat(tableHTML.split(tableHeader).pop()) 
                    
                    chrome.storage.sync.set({'wD_searchHistory_html':tableHTML}, function(){
                            console.log(" ****** Updated Word Dictionary Search History HTML Saved ******");
                    });
                
                } catch (e) { // Invalid input for database
                    console.log("error find: " + e)
                    $('#tStroke').text('');
                    $('#wD_errorMsg').text("Invalid Input: Please enter existing Chinese word/phrases and try again!");
                    $('#wordToSearch').val('');  
                }
            }
            else { // No input
                $('#tStroke').text('');
                $('#wD_errorMsg').text("No Input: Please enter existing Chinese word/phrases and try again!");
            }
        });
    });
    
    
    // My Favourite
    $('#addToMyFav').click(function(){
        chrome.storage.sync.get(['wordToAdd'], function(){
            var input = $('#wordToAdd').val(); 
            
            if (input) {
                console.log("****** Received Input For My Favourite. Input = ", input, " ******");
                var code = "";
                var valid = true
                $('#mF_errorMsg').text('');
                $('#wordToAdd').val('');  
                $('#wD_errorMsg').text('');
                $('#tStroke').text('');
                $('wordToSearch').val('');
                
                if (document.getElementById("popupTrad").checked){
                    var table_myFav = 'G6TC';
                }
                else if (document.getElementById("popupSimp").checked) {
                    var table_myFav = 'G6SC';
                }
                
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
                    $('#msgAdd').text('');
                    $('#mF_errorMsg').text("Invalid Input: Please enter existing Chinese word/phrases and try again!");
                    $('#wordToAdd').val('');  
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
                        $('#msgAdd').text('');
                        $('#mF_errorMsg').text("Duplicate Input: Input is already registered in My Favourite Collection.");
                        $('#wordToAdd').val('');  
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
                    if (document.getElementById("popupTrad").checked){
                        if (input.length == 2) {
                            table_myFav = 'G6T2P';
                        }
                        if (input.length == 3) {
                            table_myFav = 'G6T3P';
                        }
                        if (input.length > 3) {
                            table_myFav = 'G6TMP';
                        }
                    }
                    else if (document.getElementById("popupSimp").checked) {
                        if (input.length == 2) {
                            table_myFav = 'G6S2P';
                        }
                        if (input.length == 3) {
                            table_myFav = 'G6S3P';
                        }
                        if (input.length > 3) {
                            table_myFav = 'G6SMP';
                        }
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
                    $('#msgAdd').text(input + ": " + code);
                    $('#wordToAdd').val('');
                   
                    cbHTML = '<input type="checkbox" name="cbForDelete">'
                    if (document.getElementById("popupTrad").checked){
                        var newRecordHTML = "<tr><td>"+ input +"</td><td>" + code + "</td><td>T</td><td>" + cbHTML + "</td></tr>"
                    } else if (document.getElementById("popupSimp").checked){
                        var newRecordHTML = "<tr><td>"+ input +"</td><td>" + code + "</td><td>S</td><td>" + cbHTML + "</td></tr>"
                    }
                   
                    console.log("new Record HTML: " + newRecordHTML);
                    tableHTML_mF = tableHTML_mF.concat(newRecordHTML);
                    // HTML Add
                    chrome.storage.sync.set({'mF_collection_html':tableHTML_mF}, function(){
                            console.log(" ****** Updated My Favourite Collection HTML Saved ******");
                    });

                } // End of if (valid)
            }
            else { // No input
                $('#msgAdd').text('');
                $('#mF_errorMsg').text("No Input: Please enter existing Chinese word/phrases and try again!");
            }
        })
    })
    
});
