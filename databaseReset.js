$(function(){
    console.log(chrome.extension.getBackgroundPage().g6database);
    $('#msgReset').text('');
    $('#clrAR').click(function(){
    
        var freqList = chrome.extension.getBackgroundPage().updateFreqList;
        freqList.forEach(function(record){
            console.log(record);
            var sql_clr_freq = "UPDATE ".concat(record.table).concat(" SET Frequency = 0 WHERE Character = '")
                                        .concat(record.character).concat("';");
            chrome.extension.getBackgroundPage().g6database.exec(sql_clr_freq);
        });
        
        chrome.extension.getBackgroundPage().updateFreqList = [];
        chrome.storage.sync.set({'freqList_update': chrome.extension.getBackgroundPage().updateFreqList}, function(){
            console.log(" ****** Clear Freq List Saved ******");
        });
        
        $('#msgReset').text('Adaptive Ranking is Reset Successfully');
    }); // End of ClrAR Function
    
    $('#clrMyFav').click(function(){
        
        // Handle Update List
        var updateList = chrome.extension.getBackgroundPage().updateMyFavList;
        updateList.forEach(function(record){
            console.log(record);
            var sql_clr_update = "UPDATE ".concat(record.table).concat(" SET Favourite = 0 WHERE Character = '")
                                        .concat(record.character).concat("';");
            chrome.extension.getBackgroundPage().g6database.exec(sql_clr_update);            
        })
        
        chrome.extension.getBackgroundPage().updateMyFavList = [];
        chrome.storage.sync.set({'myFavList_update': chrome.extension.getBackgroundPage().updateMyFavList}, function(){
            console.log(" ****** Clear Update My Fav List Saved ******");
        });
        
        // Handle Insert List
        var insertList = chrome.extension.getBackgroundPage().insertMyFavList;
        insertList.forEach(function(record){
            console.log(record);
            var sql_clr_insert = "DELETE FROM ".concat(record.table).concat(" WHERE Character = '")
                                        .concat(record.character).concat("';");
            chrome.extension.getBackgroundPage().g6database.exec(sql_clr_insert);            
        })
        
        chrome.extension.getBackgroundPage().insertMyFavList = [];
        chrome.storage.sync.set({'myFavList_insert': chrome.extension.getBackgroundPage().insertMyFavList}, function(){
            console.log(" ****** Clear Insert My Fav List Saved ******");
        });
        
        // HTML Reset
        let resetTableHTML = "<tr><th>Word/Phrase</th><th>Code</th><th>T/S</th><th>Delete</th></tr>";
        chrome.storage.sync.set({'mF_collection_html':resetTableHTML}, function(){
            console.log(" ****** Clear My Favourite Collection HTML Saved ******");
        });
        
        $('#msgReset').text('My Favourite Collection is Reset Successfully');
    }); // End of ClrMyFav Function
})