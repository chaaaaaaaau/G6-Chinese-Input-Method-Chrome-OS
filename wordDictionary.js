$(function(){
    console.log(chrome.extension.getBackgroundPage().g6database); // Connect to G6 Database in background. No need to ajax again. 
    chrome.storage.sync.get(['wD_searchHistory_html'], function(record){
        if (record.wD_searchHistory_html) {
            var table = document.getElementById("searchHistory");
            table.innerHTML = record.wD_searchHistory_html;
            console.log(" ****** Word Dictionary Search History HTML is Found!. Update to HTML ******");
        }
    });
    
    // Execute a function when the user releases a key on the keyboard
    document.getElementById("wordToSearch").addEventListener("keyup", function(event) {
        // Number 13 is the "Enter" key on the keyboard
        if (event.keyCode === 13) {
            // Trigger the button element with a click
            document.getElementById("findWord").click();
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
                if (document.getElementById("wordDictTrad").checked){
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
                else if (document.getElementById("wordDictSimp").checked) {
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
                    $('#errorMsg').text('');
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
               
                    var table = document.getElementById("searchHistory");
                    var row = table.insertRow(1)
                    var cell1 = row.insertCell(0)
                    var cell2 = row.insertCell(1);
                    cell1.innerHTML = input
                    cell2.innerHTML = stroke;
                    
                    chrome.storage.sync.set({'wD_searchHistory_html':table.outerHTML}, function(){
                            console.log(" ****** Updated Word Dictionary Search History HTML Saved ******");
                    });
                
                } catch (e) { // Invalid input for database
                    console.log("error find: " + e)
                    $('#tStroke').text('');
                    $('#errorMsg').text("Invalid Input: Please enter existing Chinese word/phrases and try again!");
                    $('#wordToSearch').val('');  
                }
            }
            else { // No input
                $('#tStroke').text('');
                $('#errorMsg').text("No Input: Please enter existing Chinese word/phrases and try again!");
            }
        });
    });
    
    $('#delSearchHistory').click(function(){
            var table = document.getElementById("searchHistory");
            table.innerHTML = "<tr><th>Word/Phrase</th><th>Code</th></tr>";
            $('#tStroke').text('');
            $('#errorMsg').text('');
            chrome.storage.sync.set({'wD_searchHistory_html':table.outerHTML}, function(){
                console.log(" ****** Word Dictionary Search History HTML is Clear!. Update to HTML ******");
            });
    });
});