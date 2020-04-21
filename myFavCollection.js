$(function(){
    console.log(chrome.extension.getBackgroundPage().g6database); // Connect to G6 Database in background. No need to ajax again. 
    chrome.storage.sync.get(['mF_collection_html'], function(record){
        if (record.mF_collection_html) {
            var table = document.getElementById("collection");
            table.innerHTML = record.mF_collection_html;
            console.log(" ****** My Fav Collection HTML is Found!. Update to HTML ******");
        }
    });
    // Execute a function when the user releases a key on the keyboard
    document.getElementById("wordToAdd").addEventListener("keyup", function(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("addToMyFav").click();
        }
    });
    
    // My Favourite
    $('#addToMyFav').click(function(){
        chrome.storage.sync.get(['wordToAdd'], function(){
            var input = $('#wordToAdd').val(); 
            
            if (input) {
                console.log("****** Received Input For My Favourite. Input = ", input, " ******");
                var code = "";
                var valid = true
                $('#errorMsg').text('');
                
                if (document.getElementById("myFavTrad").checked){
                    var table_myFav = 'G6TC';
                }
                else if (document.getElementById("myFavSimp").checked) {
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
                    $('#errorMsg').text("Invalid Input: Please enter existing Chinese word/phrases and try again!");
                    $('#wordToAdd').val('');  
                }
                /////////////////////////////////////////////////////////////
                // Duplicate Check
                var table = document.getElementById("collection");
                for (var i = 1; i < table.rows.length; i++) {
                    row = table.rows[i];
                    if ((row.cells[0].innerHTML == input) && (row.cells[2].innerHTML == table_myFav[2])){
                        valid = false;
                        console.log("error find: duplicate error")
                        $('#msgAdd').text('');
                        $('#errorMsg').text("Duplicate Input: Input is already registered in My Favourite Collection.");
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
                    if (document.getElementById("myFavTrad").checked){
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
                    else if (document.getElementById("myFavSimp").checked) {
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
                    var table = document.getElementById("collection");
                    var row = table.insertRow(table.rows.length);
                    var cell1 = row.insertCell(0);
                    var cell2 = row.insertCell(1);
                    var cell3 = row.insertCell(2);
                    var cell4 = row.insertCell(3);
                    cell1.innerHTML = input;
                    cell2.innerHTML = code;
                    if (document.getElementById("myFavTrad").checked){
                        cell3.innerHTML = "T";
                    } else if (document.getElementById("myFavSimp").checked){
                        cell3.innerHTML = "S";
                    }
                    cell4.innerHTML = '<input type="checkbox" name="cbForDelete">'
                    
                    // HTML Add
                    chrome.storage.sync.set({'mF_collection_html':table.outerHTML}, function(){
                            console.log(" ****** Updated My Favourite Collection HTML Saved ******");
                    });

                } // End of if (valid)
            }
            else { // No input
                $('#msgAdd').text('');
                $('#errorMsg').text("No Input: Please enter existing Chinese word/phrases and try again!");
            }
        })
    })
    
    $('#delSelectedCollection').click(function(){
        $('#msgAdd').text('');
        var table = document.getElementById("collection");
        var checkboxes = document.getElementsByName("cbForDelete");
        for (var i = 1; i < table.rows.length; i++) {
            row = table.rows[i];
            //iterate through rows
            //rows would be accessed using the "row" variable assigned in the for loop
            if (checkboxes[i-1].checked) {
                console.log(" ****** target to delete : " + row.cells[0].innerHTML+ "******")
                var targetChar = row.cells[0].innerHTML
                var targetTS =  row.cells[2].innerHTML
                var targetIndex = -1 // in List index
                var targetFound = false
                
                // Start Delete
                // Delete Handle (update list)
                // Delete database record if exist (Set Fav to 0)
                        for (var j = 0; j < chrome.extension.getBackgroundPage().updateMyFavList.length; j++) {
                            let record = chrome.extension.getBackgroundPage().updateMyFavList[j];
                            if (record.table[2] == targetTS && record.character == targetChar){
                                targetFound = true;
                                targetIndex = j;
                                console.log(" ****** targetIndex: " + targetIndex + " ; character: " + record.character + "******")
                                var sql_update_delete_myFav = "UPDATE ".concat(record.table).concat(" SET Favourite = 0 WHERE Character = '")
                                                            .concat(record.character).concat("';");
                                chrome.extension.getBackgroundPage().g6database.exec(sql_update_delete_myFav);
                                console.log(" ****** Database Updated ******")
                                break;
                            }
                        }
                                
                         // Delete Storage
                        if (targetFound && targetIndex > -1) { // Maybe Target in Next List, Skip this part
                            chrome.extension.getBackgroundPage().updateMyFavList.splice(targetIndex, 1);
                            console.log(" ****** Target Deleted, List length for now: " + chrome.extension.getBackgroundPage().updateMyFavList.length + "******")
                            //console.log(" ****** Remain: " + chrome.extension.getBackgroundPage().updateMyFavList[0].character + " ******")
                            
                                   
                            chrome.storage.sync.set({'myFavList_update':chrome.extension.getBackgroundPage().updateMyFavList}, function(){
                                console.log(" ****** Storage My Fav List Updated ******");
                                })
                            
                        }
                        
                        
                        if (targetFound == false) {
                        // Database Handle (insert list)
                        // Delete database record if exist (Set Fav to 0)
                            for (var j = 0; j < chrome.extension.getBackgroundPage().insertMyFavList.length; j++) {
                                let record = chrome.extension.getBackgroundPage().insertMyFavList[j];
                                if (record.table[2] == targetTS && record.character == targetChar){
                                    targetFound = true;
                                    targetIndex = j;
                                    console.log(" ****** targetIndex: " + targetIndex + " ; character: " + record.character + "******")
                                    var sql_update_delete_myFav = "UPDATE ".concat(record.table).concat(" SET Favourite = 0 WHERE Character = '")
                                                                .concat(record.character).concat("';");
                                    chrome.extension.getBackgroundPage().g6database.exec(sql_update_delete_myFav);
                                    console.log(" ****** Database Updated ******")
                                    break;
                                }
                            }        
                                    
                            // Delete Storage
                            if (targetFound && targetIndex > -1) { // Maybe Target in Next List, Skip this part
                                chrome.extension.getBackgroundPage().insertMyFavList.splice(targetIndex, 1)
                                console.log(" ****** Target Deleted, List length for now: " + chrome.extension.getBackgroundPage().updateMyFavList.length + "******")
                                chrome.storage.sync.set({'myFavList_insert':chrome.extension.getBackgroundPage().insertMyFavList}, function(){
                                    console.log(" ****** Storage My Fav List (inserted) Updated ******");
                                })
                            }
                        } // End of if (targetfound == false)
                //End of Start Delete
            }
        } // End of for loop
        
        // HTML Delete
        var tableIndexToDelete = new Array();
        for (var i = 0; i < checkboxes.length; i++){
            if (checkboxes[i].checked){
                tableIndexToDelete.push(i+1)
            }
        }

        var deletedRow = 0; // Store the number of deleted rows for calculation, as the change of row number      
        for (var i = 0; i < tableIndexToDelete.length; i++){
            console.log(" ****** Table index to delete: "+ (tableIndexToDelete[i] - deletedRow) +" ******")
            table.deleteRow(tableIndexToDelete[i] - deletedRow);
            deletedRow++ ;
        }

        
        // HTML Save after Delete
        chrome.storage.sync.set({'mF_collection_html':table.outerHTML}, function(){
            console.log(" ****** Updated My Favourite Collection HTML Saved ******");
        });
        
    })
    
});
