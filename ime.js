// Copyright 2010-2018, Google Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
// copyright notice, this list of conditions and the following disclaimer
// in the documentation and/or other materials provided with the
// distribution.
//     * Neither the name of Google Inc. nor the names of its
// contributors may be used to endorse or promote products derived from
// this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * @fileoverview Sample IME for ChromeOS with IME Extension API.
 */
'use strict';
var sql_table="G6TCF";
var testing = "HI";
var g6database;
var existDatabase;
var databaseGot = false;

var updateMyFavList = [];
var insertMyFavList = [];
var updateFreqList = [];
/**
 * Namespace for this extension.
 */
var sampleImeForImeExtensionApi = window.sampleImeForImeExtensionApi || {};
/**
 * Sample IME with IME extension API.
 * @constructor
 */
sampleImeForImeExtensionApi.SampleIme = function() {
  var that = this;
           
    ajax('g6.sqlite').then(function(result) {
            that.db_ = result; //http response arraybuffer -> uInt8Array -> pass to SQL.js
            g6database = result;

            console.log(g6database);
            that.context_ = null;
            that.engineID_ = '';
            that.clear_();
            that.initializeMenuItems_();
            that.db = '';
            var SQL = window.SQL; 
            var ime = that;
            chrome.input.ime.onActivate.addListener(
                  function(engineID) { ime.onActivate(engineID); });
              chrome.input.ime.onDeactivated.addListener(
                  function(engineID) { ime.onDeactivated(engineID); });
              chrome.input.ime.onFocus.addListener(
                  function(context) { ime.onFocus(context); });
              chrome.input.ime.onBlur.addListener(
                  function(contextID) { ime.onBlur(contextID); });
              chrome.input.ime.onInputContextUpdate.addListener(
                  function(context) { ime.onInputContextUpdate(context); });
              chrome.input.ime.onKeyEvent.addListener(
                  function(engineID, keyData) {
                    return ime.onKeyEvent(engineID, keyData);
                  });
              chrome.input.ime.onCandidateClicked.addListener(
                  function(engineID, candidateID, button) {
                    ime.onCandidateClicked(engineID, candidateID, button);
                  });
              chrome.input.ime.onMenuItemActivated.addListener(
                  function(engineID, name) {
                    ime.onMenuItemActivated(engineID, name);
                  });
           })
    
    
};
            
        

/**
 * Stringifies key event data.
 * @param {!Object} keyData Key event data.
 * @return {string} Stringified key event data.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.stringifyKeyAndModifiers_ =
    function(keyData) {
  var keys = [keyData.key];
  if (keyData.altKey) { keys.push('alt'); }
  if (keyData.ctrlKey) { keys.push('ctrl'); }
  if (keyData.shiftKey) { keys.push('shift'); }
  return keys.join(' ');
};

/**
 * Ignorable key set to determine we handle the key event or not.
 * @type {!Object.<boolean>}
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.IGNORABLE_KEY_SET_ = (function() {
  var IGNORABLE_KEYS = [
    {  // PrintScreen shortcut.
      key: 'ChromeOSSwitchWindow',
      ctrlKey: true
    }, {  // PrintScreen shortcut.
      key: 'ChromeOSSwitchWindow',
      ctrlKey: true,
      shiftKey: true
    }
  ];

  var ignorableKeySet = [];
  for (var i = 0; i < IGNORABLE_KEYS.length; ++i) {
    var key = sampleImeForImeExtensionApi.SampleIme.prototype.
        stringifyKeyAndModifiers_(IGNORABLE_KEYS[i]);
    ignorableKeySet[key] = true;
  }

  return ignorableKeySet;
})();

/**
 * Immutable conversion table. It is used to suggest special candidates.
 * @type {!Object.<string>}
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.CONVERSION_TABLE_ = {
  star: '\u2606',  // '??
  heart: '\u2661'  // '??
};

/**
 * Page size of a candidate list.
 * This value should not be greater than 12 since we use Roman number to
 * indicates the candidate number on the list.
 * @type {number}
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.PAGE_SIZE_ = 9;

/**
 * Enum of IME state.
 * @enum {number}
 */
sampleImeForImeExtensionApi.SampleIme.State = {
  /** IME doesn't have any input text. */
  PRECOMPOSITION: 0,
  /**
   * IME has a input text, but no candidate are expressly selected or input text
   * is not segmented.
   */
  COMPOSITION: 1,
  /**
   * IME has a input text, and one of the candidate is selected or input text is
   * segmentated.
   */
  CONVERSION: 2,
 
};

/**
 * Segment information of a composition text.
 * @constructor
 */
sampleImeForImeExtensionApi.SampleIme.Segment = function() {
  /**
   * Start position of the segment.
   * @type {number}
   */
  this.start = 0;

  /**
   * Candidates list.
   * @type {!Array.<string>}
   */
  this.candidates = [];

  /**
   * Focused candidate index.
   * @type {number}
   */
  this.focusedIndex = 0;
};

/**
 * Initializes menu items and some member variables.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.initializeMenuItems_ =
    function() {
  var menuItems = [];
  var callbacks = {};
  var that = this;

  /**
   * Indicates IME suggests dummy candidates or not.
   * @type {boolean}
   * @private
   */
  
  //this.previousInputMode = ""
   
  this.useDummyCandidates_ = true;
  this.useChineseInput_ = true;
  this.useSixStroke_ = false;
  this.use2WordPhrase_ = false;
  this.use3WordPhrase_ = false;
  this.useMWordPhrase_ = false;
  
  // 20191029
  this.usePunctuation_ = false
  
  // 20191030
  this.useSimplifiedChinese_ = false
  
  // 20200116
  this.useUIOJKL_ = true
  this.useJKLUIO_ = false
  
  this.useSingleHand_ = false
  this.useLeftSingleHand_ = false
  
  // 20200207
  this.usePrediction_ = false
  this.useFrequency_ = false
  
  this.usingSQLTable_ = 'G6TCF'
  
  // 20200208
  this.numOfCandidates = 20
  this.predicting_= false
  
  // 20200302
  this.word = ''
  
  var enableChineseInputItem = {	// Toggle Chinese input
    id: 'input_language_is_chinese',
    label: 'Chinese Input Language',
    style: 'check',
    checked: true
  };
  menuItems.push(enableChineseInputItem);
  callbacks[enableChineseInputItem.id] = function() {
    enableChineseInputItem.checked = !enableChineseInputItem.checked;
    that.useChineseInput_ = enableChineseInputItem.checked
	console.log("Chinese Input status: " + enableChineseInputItem.checked);
  };
  
  var enableSixStroke = {	// Toggle Six Stroke Mode
    id: 'enable_six_stroke',
    label: 'G6 Character Input',
    style: 'check',
    checked: false
  };
  menuItems.push(enableSixStroke);
  callbacks[enableSixStroke.id] = function() {
      if (that.useChineseInput_){
        enableSixStroke.checked = !enableSixStroke.checked;
        if(enableSixStroke.checked){
        enable2WordPhraseMode.checked = false;
        enable3WordPhraseMode.checked = false;
        enableMWordPhraseMode.checked = false;
        enablePunctuationMode.checked = false;
        that.use2WordPhrase_ = false;
        that.use3WordPhrase_ = false;
        that.useMWordPhrase_ = false;
        that.usePunctuation_ = false;
        }
        that.useSixStroke_ = enableSixStroke.checked
    	console.log("Six Stroke Mode: " + enableSixStroke.checked);
      }
  };
  
  var enable2WordPhraseMode = {	// Toggle 2-Word Phrase Mode
    id: 'enable_2_word_phrase_mode',
    label: 'G6 2-character Phrase Input',
    style: 'check',
    checked: false
  };
  menuItems.push(enable2WordPhraseMode);
  callbacks[enable2WordPhraseMode.id] = function() {
      if (that.useChineseInput_){
        enable2WordPhraseMode.checked = !enable2WordPhraseMode.checked;
        if(enable2WordPhraseMode.checked){
        enablePunctuationMode.checked = false;
        enableSixStroke.checked = false;
        enable3WordPhraseMode.checked = false;
        enableMWordPhraseMode.checked = false;
        that.usePunctuation_ = false;
        that.useSixStroke_ = false;
        that.use3WordPhrase_ = false;
        that.useMWordPhrase_ = false;
        }
        that.use2WordPhrase_ = enable2WordPhraseMode.checked
    	console.log("2-Word Phrase Mode: " + enable2WordPhraseMode.checked);
      }
  };
  
  var enable3WordPhraseMode = {	// Toggle 3-Word Phrase Mode
    id: 'enable_3_word_phrase_mode',
    label: 'G6 3-character Phrase Input',
    style: 'check',
    checked: false
  };
  menuItems.push(enable3WordPhraseMode);
  callbacks[enable3WordPhraseMode.id] = function() {
      if (that.useChineseInput_){
        enable3WordPhraseMode.checked = !enable3WordPhraseMode.checked;
        if(enable3WordPhraseMode.checked){
        enable2WordPhraseMode.checked = false;
        enablePunctuationMode.checked = false;
        enableSixStroke.checked = false;
        enableMWordPhraseMode.checked = false;
        that.use2WordPhrase_ = false;
        that.usePunctuation_ = false;
        that.useSixStroke_ = false;
        that.useMWordPhrase_ = false;
        }
        that.use3WordPhrase_ = enable3WordPhraseMode.checked
    	console.log("3-Word Phrase Mode: " + enable3WordPhraseMode.checked);
      }
  };
  
  var enableMWordPhraseMode = {	// Toggle 4-Word Phrase Mode
    id: 'enable_M_word_phrase_mode',
    label: 'G6 M-character Phrase Input',
    style: 'check',
    checked: false
  };
  menuItems.push(enableMWordPhraseMode);
  callbacks[enableMWordPhraseMode.id] = function() {
      if (that.useChineseInput_){
        enableMWordPhraseMode.checked = !enableMWordPhraseMode.checked;
        if(enableMWordPhraseMode.checked){
        enable2WordPhraseMode.checked = false;
        enable3WordPhraseMode.checked = false;
        enablePunctuationMode.checked = false;
        enableSixStroke.checked = false;
        that.use2WordPhrase_ = false;
        that.use3WordPhrase_ = false;
        that.usePunctuation_ = false;
        that.useSixStroke_ = false;
        }
        that.useMWordPhrase_ = enableMWordPhraseMode.checked
    	console.log("M-Word Phrase Mode: " + enableMWordPhraseMode.checked);
      }
  };
  
  //20191029
  var enablePunctuationMode = { // 20191029: Punctuation Input
      id: 'enable_punctuation_mode',
      label: 'Punctuation Input',
      style: 'check',
      checked: false
  };
  menuItems.push(enablePunctuationMode);
  callbacks[enablePunctuationMode.id] = function() {
      if (that.useChineseInput_){
        enablePunctuationMode.checked = !enablePunctuationMode.checked;
        if(enablePunctuationMode.checked){
            enable2WordPhraseMode.checked = false;
            enable3WordPhraseMode.checked = false;
            enableMWordPhraseMode.checked = false;
            enableSixStroke.checked = false;
            that.use2WordPhrase_ = false;
            that.use3WordPhrase_ = false;
            that.useMWordPhrase_ = false;
            that.useSixStroke_ = false;
        }
        that.usePunctuation_ = enablePunctuationMode.checked
        console.log("Punctuation Mode: " + enablePunctuationMode.checked);
      }
  };
  
  //20191030
   var enableSimplifiedChinese = {	// Toggle SimplifiedChinese
    id: 'input_simplified_chinese',
    label: 'Simplified Chinese Input',
    style: 'check',
    checked: false
  };
  menuItems.push(enableSimplifiedChinese);
  callbacks[enableSimplifiedChinese.id] = function() {
    enableSimplifiedChinese.checked = !enableSimplifiedChinese.checked;
    that.useSimplifiedChinese_ = enableSimplifiedChinese.checked
	console.log("Simplified Chinese status: " + enableSimplifiedChinese.checked);
  };
  
  //////////////////////////////////// 20200116: handle UIOJKL/JKLUIO
  var enableUIOJKL = {
    id: 'enable_uiojkl_keyboard',
    label: 'UIOJKL Keyboard',
    style: 'check',
    checked: true
  };
  menuItems.push(enableUIOJKL);
  callbacks[enableUIOJKL.id] = function() {
    enableUIOJKL.checked = !enableUIOJKL.checked;
    enableJKLUIO.checked = !enableJKLUIO.checked;
    that.useUIOJKL_ = enableUIOJKL.checked;
    that.useJKLUIO_ = enableJKLUIO.checked;
    console.log("Keyboard UIOJKL: " + enableUIOJKL.checked);
    console.log("Keyboard JKLUIO: " + enableJKLUIO.checked);
  };
  
  var enableJKLUIO = {
    id: 'enable_jkluio_keyboard',
    label: 'JKLUIO Keyboard',
    style: 'check',
    checked: false
  };
  menuItems.push(enableJKLUIO);
  callbacks[enableJKLUIO.id] = function() {
    enableUIOJKL.checked = !enableUIOJKL.checked;
    enableJKLUIO.checked = !enableJKLUIO.checked;
    that.useUIOJKL_ = enableUIOJKL.checked;
    that.useJKLUIO_ = enableJKLUIO.checked;
    console.log("Keyboard UIOJKL: " + enableUIOJKL.checked);
    console.log("Keyboard JKLUIO: " + enableJKLUIO.checked);
  };
  
  ////////////////////////////////////

  
  var enableSingleHand = {
    id: 'enable_single_hand_mode',
    label: 'Single Hand Configuration',
    style: 'check',
    checked: false
  };
  menuItems.push(enableSingleHand);
  callbacks[enableSingleHand.id] = function() {
      enableSingleHand.checked = !enableSingleHand.checked;
      enableLeftSingleHand.checked = false;
      that.useSingleHand_ = enableSingleHand.checked;
      that.useLeftSingleHand_ = enableLeftSingleHand.checked;
      console.log("Use Single Hand: " + enableSingleHand.checked);
      console.log("Use Left Single Hand: " + enableLeftSingleHand.checked);
  };
  
  var enableLeftSingleHand = {
    id: 'enable_left_single_hand_mode',
    label: 'Single Left-hand Configuration',
    style: 'check',
    checked: false
  };
  menuItems.push(enableLeftSingleHand);
  callbacks[enableLeftSingleHand.id] = function() {
      enableSingleHand.checked = false;
      enableLeftSingleHand.checked = !enableLeftSingleHand.checked;
      that.useSingleHand_ = enableSingleHand.checked;
      that.useLeftSingleHand_ = enableLeftSingleHand.checked;
      console.log("Use Single Hand: " + enableSingleHand.checked);
      console.log("Use Left Single Hand: " + enableLeftSingleHand.checked);
  };
  
  ////////////////////////////////////
  // 20200207
  
  var enablePrediction = {
    id: 'enable_prediction',
    label: 'Word Prediction',
    style: 'check',
    checked: false
  };
  menuItems.push(enablePrediction);
  callbacks[enablePrediction.id] = function() {
      enablePrediction.checked = !enablePrediction.checked;
      that.usePrediction_ = enablePrediction.checked;
      if (!that.usePrediction_) {
          that.predicting_ = false;
          console.log("System: Predicting: Turn Off ");
      }
      console.log("Use Prediction: " + enablePrediction.checked);
  };
  
  var enableFrequency = {
    id: 'enable_frequency',
    label: 'Adaptive Ranking',
    style: 'check',
    checked: false
  };
  menuItems.push(enableFrequency);
  callbacks[enableFrequency.id] = function() {
      enableFrequency.checked = !enableFrequency.checked;
      that.useFrequency_ = enableFrequency.checked;
      console.log("Use Frequency: " + enableFrequency.checked);
  };

  /**
   * Menu items of this IME.
   */
  this.menuItems_ = menuItems;

  /**
   * Callback function table which is called when menu item is clicked.
   */
  this.menuItemCallbackTable_ = callbacks;
  this.enableSixStroke_ = enableSixStroke;
  
  // To Initialize Database Access (Avoid Delay When Real Using)
  g6database.exec("SELECT * FROM G6TC WHERE _id = 1;");
  g6database.exec('INSERT INTO G6PUN VALUES(38,"丿","","","","","","，",0,0)');
  
  //////////////////////////////////// 20200307
  chrome.storage.sync.get(['myFavList_update'],function(list) {
        
        if (list.myFavList_update) {
            updateMyFavList = list.myFavList_update;
            console.log(" ****** My Fav List is Found!. Update to Database ******");
            updateMyFavList.forEach(function(record) {
            var sql_update_saved_myFav = "UPDATE ".concat(record.table).concat(" SET Favourite = 1 WHERE Character = '")
                                        .concat(record.character).concat("';");
            g6database.exec(sql_update_saved_myFav);
            });
            console.log(" ****** Updated ******");
        }
    });     

    chrome.storage.sync.get(['myFavList_insert'],function(list) {
        
        if (list.myFavList_insert) {
            insertMyFavList = list.myFavList_insert;
            console.log(" ****** My Fav List is Found!. Update (Insert) to Database ******");
            insertMyFavList.forEach(function(record) {
            var sql_insert_saved_myFav = "INSERT INTO ".concat(record.table).concat(" VALUES ('")
                                        .concat(record.id).concat("','")
                                        .concat(record.code0).concat("','")
                                        .concat(record.code1).concat("','")
                                        .concat(record.code2).concat("','")
                                        .concat(record.code3).concat("','") // For Character No 6 Codes Should have some empty
                                        .concat(record.code4).concat("','")
                                        .concat(record.code5).concat("','") 
                                        .concat(record.character).concat("','")
                                        .concat("0','1');");
            console.log(sql_insert_saved_myFav);
            g6database.exec(sql_insert_saved_myFav);
            });
            console.log(" ****** Updated (Inserted) ******");
        }
    });   
    
    chrome.storage.sync.get(['freqList_update'],function(list) {
        
        if (list.freqList_update) {
            console.log(list.freqList_update);
            updateFreqList = list.freqList_update;
            console.log(" ****** Freq List is Found!. Update to Database ******");
            updateFreqList.forEach(function(record) {
                var sql_update_saved_freq = "UPDATE ".concat(record.table).concat(" SET Frequency = ").concat(record.frequency)
                                            .concat(" WHERE Character = '").concat(record.character).concat("';");
                console.log(sql_update_saved_freq);
                g6database.exec(sql_update_saved_freq);
            });
            console.log(" ****** Updated ******");
        }
    });    
    
  
};

/**
 * Clears properties of IME.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.clear_ = function() {
  /**
   * Raw input text.
   * @type {string}
   * @private
   */
  this.inputText_ = '';

  /**
   * Commit text.
   * This is a volatile property, and will be cleared by
   * `sampleImeForImeExtensionApi.SampleIme.updateCommitText_`.
   * @type {?string}
   * @private
   */
  this.commitText_ = null;

  /**
   * Segments information.
   * @type {!Array.<!sampleImeForImeExtensionApi.SampleIme.Segment>}
   * @private
   */
  this.segments_ = [];

  /**
   * Cursor position.
   * @type {number}
   * @private
   */
  this.cursor_ = 0;

  /**
   * Focused segment index.
   * @type {number}
   * @private
   */
  this.focusedSegmentIndex_ = 0;

  /**
   * The state of the IME.
   * @type {sampleImeForImeExtensionApi.SampleIme.State}
   * @private
   */
  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION;
};

/**
 * Determines that IME is enabled or not using a context information.
 * @return {boolean} IME is enabled or not.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.isImeEnabled_ = function() {
  return this.context_ != null;
};

/**
 * Appends a new empty segment on
 * `sampleImeForImeExtensionApi.SampleIme.segments`.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.appendNewSegment_ = function() {
  var startPosition = this.inputText_.length;
  if (this.segments_.length == 0) {
    startPosition = 0;
  }

  var newSegment = new sampleImeForImeExtensionApi.SampleIme.Segment();
  newSegment.start = startPosition;

  this.segments_.push(newSegment);
};

/**
 * Gets input text on the segment.
 * @param {number=} opt_segmentIndex Index of the segment you want to get
 *     a text. this.focusedSegmentIndex_ is used as a default value.
 * @return {string} Input text of the segment.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.getInputTextOnSegment_ =
    function(opt_segmentIndex) {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return '';
  }

  var segmentIndex = (opt_segmentIndex == undefined) ?
      this.focusedSegmentIndex_ : opt_segmentIndex;
  if (segmentIndex < 0 || this.segments_.length <= segmentIndex) {
    return '';
  }

  var start = this.segments_[segmentIndex].start;
  var end = (segmentIndex + 1 == this.segments_.length) ?
      this.inputText_.length : this.segments_[segmentIndex + 1].start;
  var length = end - start;

  return this.inputText_.substr(start, length);
};

//////////////////////// 20200206 generate candidate test!

sampleImeForImeExtensionApi.SampleIme.prototype.predictCandidates_ =
    async function(opt_segmentIndex) {
        if (this.state_ ==
            sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
            return;
    }
    
    console.log("**************** Start Predict Candidates ****************")
    
    var segmentIndex = (opt_segmentIndex == undefined) ?
        this.focusedSegmentIndex_ : opt_segmentIndex;
        if (segmentIndex < 0 || this.segments_.length <= segmentIndex) {
            return;
        }
    
    var segment = this.segments_[segmentIndex];
    var text = this.getInputTextOnSegment_(segmentIndex);

    segment.focusedIndex = 0;

    if (text == '') {
        segment.candidates = [];
        return;
    }
    
    var list = ['日','月','金','木','水','火','土','竹','戈','十','大','中','一','弓','人','心','手','口'];
    var sql_begin = "SELECT substr(Character,2) FROM ";
    
    console.log(g6database);
    
    // later add other table 20200206
    var sql_complete = sql_begin.concat('G6T2P').concat(" WHERE ");
    
    // finish new sql statement here 20200206
    sql_complete = sql_complete.concat("Character like '");
    sql_complete = sql_complete.concat(this.inputText_.substring(this.inputText_.length-1)).concat("%'")
    if (this.useFrequency_) {
        sql_complete = sql_complete.concat(" ORDER BY Favourite DESC, Frequency DESC;")
    }
    // *****
    else {
        sql_complete = sql_complete.concat(" ORDER BY Favourite DESC;");
    }
    console.log(sql_complete);
    
    var contents = g6database.exec(sql_complete);
    console.log(contents[0].values);
    console.log(contents[0].values[0])
    
    if (contents[0].values.length < this.numOfCandidates) {
            // Candidates < 20
            for (var j = 0; j < contents[0].values.length ; ++j) {
                segment.candidates[j] = contents[0].values[j].toString();
            }
    } else {
            for (var j = 0; j < this.numOfCandidates ; ++j) {
                segment.candidates[j] = contents[0].values[j].toString();
            }
    }
    
    /*
    for(var j=0; j< this.numOfCandidates; j++){
        segment.candidates[j] = contents[0].values[j].toString();
    }
    */
    var table = sampleImeForImeExtensionApi.SampleIme.CONVERSION_TABLE_;
    if (text in table) {
        segment.candidates.push(table[text]);
    }

}

///////////////////////////////////////////////////////////
// 20200207: Function for determining sql table in use 
sampleImeForImeExtensionApi.SampleIme.prototype.getSQLTableInUse_ = function() {
    
    // 20191030
    // Add simplified Chinese Case
    var table = '';
    if (this.useSixStroke_) {
          table = "G6TC";
          if (this.useSimplifiedChinese_) {
              table = "G6SC";
          }
          
    } else {
          table = "G6TCF";
          if (this.useSimplifiedChinese_) {
              table = "G6SCF";
          }
    }
      
    if (this.use2WordPhrase_){
          table = "G6T2P";
          if (this.useSimplifiedChinese_) {
              table = "G6S2P";
          }
    } else if (this.use3WordPhrase_){
          table = "G6T3P";
          if (this.useSimplifiedChinese_) {
              table = "G6S3P";
          }
    } else if (this.useMWordPhrase_){
          table = "G6TMP";
          if (this.useSimplifiedChinese_) {
              table = "G6SMP";
          }
          // 20191029
    }else if (this.usePunctuation_){
          table = "G6PUN";
    }
    
    return table;
};

/**
 * Generates and sets candidates of the segment.
 * @param {number=} opt_segmentIndex Index of the segment you want to get a
 *     text. `sampleImeForImeExtensionApi.SampleIme.focusedSegmentIndex_`
 *     is used as a default value.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.generateCandidates_ =
   async function(opt_segmentIndex) {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return;
  }

  var segmentIndex = (opt_segmentIndex == undefined) ?
      this.focusedSegmentIndex_ : opt_segmentIndex;
  if (segmentIndex < 0 || this.segments_.length <= segmentIndex) {
    return;
  }

  var segment = this.segments_[segmentIndex];
  var text = this.getInputTextOnSegment_(segmentIndex);

  segment.focusedIndex = 0;

  if (text == '') {
    segment.candidates = [];
    return;
  }

  // add g6 search?
  // getList(string, table)
  var list = ['日','月','金','木','水','火','土','竹','戈','十','大','中','一','弓','人','心','手','口'];
  
  console.log(g6database);
  
  // Current SQL Table
  this.usingSQLTable_ = this.getSQLTableInUse_();
  
  var sql_select_char = "SELECT Character FROM ";
        sql_select_char = sql_select_char.concat(this.usingSQLTable_).concat(" WHERE ");
  var i;
  var len = this.inputText_.length;
  console.log(len);
  var substr;
    
  for (i=0;i<this.inputText_.length;i++){ //loop through every stroke in commitText_
      substr = this.inputText_.substr(i,1); //ith stroke in commitText_
      if(substr == '＊'){
        continue;
      }
      
      console.log(substr);
      console.log(i+" "+ (i+1));
      var code = "Code".concat(i.toString()); //Code0, Code1, Code2... Codei
      console.log(code);
      
      sql_select_char = sql_select_char.concat(code + " = '" + substr + "'");
      substr = "";
      
      if (i != this.inputText_.length - 1){ //if not reach end of commitText_ append 'AND'
        sql_select_char = sql_select_char.concat(" AND ");

      }else {
          
          //20200208 Use Frequency:
          if (this.useFrequency_) {
              sql_select_char = sql_select_char.concat(" ORDER BY Favourite DESC, Frequency DESC")
          }
          ///////////
          else {
                sql_select_char = sql_select_char.concat("ORDER BY Favourite DESC;");
          }

      }
  }
  //var contents = this.db_.exec("SELECT Character FROM G6TCF WHERE Code0 = '一' AND Code1 = '丨' AND Code2 ='';");
  console.log(sql_select_char)
  var contents = g6database.exec(sql_select_char);
  //console.log(contents[0].values);
  console.log(contents[0].values[0])
  //segment.candidates = contents[0].values[0];
  
   if (contents[0].values.length < this.numOfCandidates) {
            // Candidates < 20
            for (var j = 0; j < contents[0].values.length ; ++j) {
                segment.candidates[j] = contents[0].values[j].toString();
            }
    } else {
            for (var j = 0; j < this.numOfCandidates ; ++j) {
                segment.candidates[j] = contents[0].values[j].toString();
            }
    }
  /*
  for(var j=0; j< this.numOfCandidates ; j++){
      segment.candidates[j] = contents[0].values[j].toString();
  }
  */
  var table = sampleImeForImeExtensionApi.SampleIme.CONVERSION_TABLE_;
  if (text in table) {
    segment.candidates.push(table[text]);
  }

};

/**
 * Gets preedit text.
 * @return {string} Preedit text.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.getPreeditText_ = function() {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return '';
  }

  var texts = [];
  for (var i = 0; i < this.segments_.length; ++i) {
    var segment = this.segments_[i];
    texts.push(segment.candidates[segment.focusedIndex]);
  }
  return texts.join('');
};

/**
 * Updates preedit text.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.updatePreedit_ = function() {
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    chrome.input.ime.clearComposition( {contextID: this.context_.contextID}, function(success) {
      console.log('Composition is cleared. result=' + success);
    });
    return;
  }
  
  // 20191030: Add 3 === console statement for G6PUN investigation.
  // Bug: Cannot input stroke o which for ,
  
  
  var segmentsData = [];
  console.log(" === segment length =============> " +this.segments_.length)
  for (var i = 0; i < this.segments_.length; ++i) {
    console.log("==== focusedIndex ===> " + this.segments_[i].focusedIndex)
    var text = this.segments_[i].candidates[this.segments_[i].focusedIndex];
    console.log("=== text ===> " +text)
    var start = i == 0 ? 0 : segmentsData[i - 1].end;
    var end = start + text.length;

    segmentsData.push({
      start: start,
      end: end,
      style: 'underline'
    });
  }
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    segmentsData[this.focusedSegmentIndex_].style = 'doubleUnderline';
  }

  var cursorPos = 0;
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    for (var i = 0; i < this.focusedSegmentIndex_; ++i) {
      var segment = this.segments_[i];
      cursorPos += segment.candidates[segment.focusedIndex].length;
    }
  } else {
    cursorPos = this.cursor_;
  }

  var composition = {
    contextID: this.context_.contextID,
    text: this.inputText_,//text: this.getPreeditText_(),
    segments: segmentsData,
    cursor: cursorPos
  };

  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    composition.selectionStart = segmentsData[this.focusedSegmentIndex_].start;
    composition.selectionEnd = segmentsData[this.focusedSegmentIndex_].end;
  }

  chrome.input.ime.setComposition(composition, function(success) {
    console.log('Composition is set. result=' + success);
  });
};

/**
 * Updates candidates.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.updateCandidates_ = function() {
  var candidateWindowPropertiesCallback = function(success) {
    console.log('Candidate window properties are updated. result=' + success);
  };

  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
          
        if (this.usePrediction_) {
            this.predicting_ = false;
            console.log("System: Predicting: Turn Off ");
        }  
          
        chrome.input.ime.setCandidateWindowProperties({
          engineID: this.engineID_,
          properties: {
            visible: false,
            auxiliaryTextVisible: false
          }
        }, candidateWindowPropertiesCallback);
  } else {
    var PAGE_SIZE = sampleImeForImeExtensionApi.SampleIme.PAGE_SIZE_;
    var segment = this.segments_[this.focusedSegmentIndex_];

    //test
    console.log(" !!!!!!!!! test: ", segment.candidates[0])

    ///////////////////////// 20200116 left hand / single hand
    // Roman number.
    // labels.push(String.fromCharCode(0x2160 + i));  // '?? + i
    // Basic Latin number.
    ///////////////////////// Handle Number Display
    
    var labels = [];
    if (this.useSingleHand_){ // Right Hand Single 0 9 8 7 6 5 4 3 2
        labels.push(String.fromCharCode(0x0030)); // 0
        for (var i = 0; i < PAGE_SIZE - 1 ; ++i) {
            labels.push(String.fromCharCode(0x0039 - i)); // 9 - 2
        }
    }
    else { // Normal or Left Hand 1 2 3 4 5 6 7 8 9
        for (var i = 0; i < PAGE_SIZE ; ++i) {
            labels.push(String.fromCharCode(0x0031 + i));  // 1 - 9
        }
    }	
    /////////////////////////////////////////////////////////////////
    // Frequency Handle
    
    // 20200207: For Annotation Display
    var annotations = [];
    
    //if (this.useFrequency_) {
        
    // Current SQL Table
    this.usingSQLTable_ = this.getSQLTableInUse_();
        
    // Start SQL Statement
    // 20200306 Add My Favourite Annotation
        
    var sql_select_anno = "SELECT Favourite FROM ";
    if (this.useFrequency_) {
        sql_select_anno = "SELECT Favourite, Frequency FROM ";
    }
    //var sql_select_freq = "SELECT Favourite, Frequency FROM ";
        
        
        if (this.predicting_) {
            if (this.useSimplifiedChinese_) {
                sql_select_anno = sql_select_anno.concat("G6S2P WHERE Character LIKE '");
            }
            else {
                sql_select_anno = sql_select_anno.concat("G6T2P WHERE Character LIKE '");
            }
            if (this.useFrequency_) {
                sql_select_anno = sql_select_anno.concat(this.inputText_.substring(this.inputText_.length-1)).concat("%' ORDER BY Favourite DESC, Frequency DESC;");
            }
            else {
                sql_select_anno = sql_select_anno.concat(this.inputText_.substring(this.inputText_.length-1)).concat("%' ORDER BY Favourite DESC;")
            }
        }
        else {
            sql_select_anno = sql_select_anno.concat(this.usingSQLTable_)
            sql_select_anno = sql_select_anno.concat(" WHERE ");
        
              var j;
              var len = this.inputText_.length;
              console.log(len);
              var substr;
        
              for (j=0;j<this.inputText_.length;j++){ //loop through every stroke in commitText_
                  substr = this.inputText_.substr(j,1); //ith stroke in commitText_
                  if(substr == '＊'){
                    continue;
                  }
                  
                  console.log(substr);
                  console.log(j+" "+ (j+1));
                  var code = "Code".concat(j.toString()); //Code0, Code1, Code2... Codei
                  console.log(code);
                  
                  sql_select_anno = sql_select_anno.concat(code + " = '" + substr + "'");
                  substr = "";
                  
                  if (j != this.inputText_.length - 1){ //if not reach end of commitText_ append 'AND'
                    sql_select_anno = sql_select_anno.concat(" AND ");
                    //console.log(sql_complete);
                  }else {
                      //20200208 Use Frequency
                      if (this.useFrequency_) {
                          sql_select_anno = sql_select_anno.concat(" ORDER BY Favourite DESC, Frequency DESC;")
                      }
                      else {
                        sql_select_anno = sql_select_anno.concat("ORDER BY Favourite DESC;");
                      }
                   // console.log(sql_complete);
                  }
              }
        }
        /////
        console.log(sql_select_anno)
        var freq_contents = g6database.exec(sql_select_anno)
        
        var freq_contents_split;
        if (freq_contents[0].values.length < this.numOfCandidates) {
            // Candidates < 20
            for (var i = 0; i < freq_contents[0].values.length ; ++i) {
                freq_contents_split = freq_contents[0].values[i].toString().split(',');
                if (freq_contents_split[0] == "1") {
                    if (this.useFrequency_) {
                        annotations.push("*" + freq_contents_split[1]); 
                    } else {
                         annotations.push("*"); 
                    }
                } 
                else {
                    if (this.useFrequency_) {
                        annotations.push(" " + freq_contents_split[1]); 
                    } else {
                         annotations.push(" "); 
                    } 
                }
            }
        } else {
            for (var i = 0; i < this.numOfCandidates ; ++i) {
                freq_contents_split = freq_contents[0].values[i].toString().split(',');
                if (freq_contents_split[0] == "1") {
                    if (this.useFrequency_) {
                        annotations.push("*" + freq_contents_split[1]); 
                    } else {
                         annotations.push("*"); 
                    }
                } 
                else {
                    if (this.useFrequency_) {
                        annotations.push(" " + freq_contents_split[1]); 
                    } else {
                         annotations.push(" "); 
                    } 
                }
            }
        }
    

    //}
    
    chrome.input.ime.setCandidates({
      contextID: this.context_.contextID,
      candidates: segment.candidates.map(function(value, index) {
        var candidate = {
          candidate: value,
          id: index,
          label: labels[index % PAGE_SIZE],
          annotation: annotations[index]
        };
        /*
        if ((index == 0) && (annotations[index] == []))  {
           candidate.annotation = '1st candidate';
        }
        */
        return candidate;
      })
    }, function(success) {
      console.log('Candidates are set. result=' + success);
    });
    chrome.input.ime.setCursorPosition({
      contextID: this.context_.contextID,
      candidateID: segment.focusedIndex
    }, function(success) {
      console.log('Cursor position is set. result=' + success);
    });
    chrome.input.ime.setCandidateWindowProperties({
      engineID: this.engineID_,
      properties: {
        visible: true,
        cursorVisible: true,
        vertical: true,
        pageSize: PAGE_SIZE,
        auxiliaryTextVisible: true,
        auxiliaryText: 'G6 IME'
      }
    }, candidateWindowPropertiesCallback);
  }
};

/**
 * Updates commit text if `commitText_` isn't null.
 * This function clears `commitText_` since it is a volatile property.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.updateCommitText_ = function() {
  if (this.commitText_ === null) {
    return;
  }

  chrome.input.ime.commitText({
    contextID: this.context_.contextID,
    text: this.commitText_
  }, function(success) {
    console.log('Commited. result=' + success);
  });
  
  // 20200206
  // After Commit a text, instantly perform prediction.
  // Some Initialization before Prediction
  if (this.usePrediction_) {
      //this.inputText_.substring(this.inputText_.length-1)
      this.inputText_ = this.commitText_.substring(this.commitText_.length-1);
      this.commitText_ = null;
      console.log('inputtext_ : ',this.inputText_)
      this.cursor_ = this.inputText_.length;
      this.focusedSegmentIndex_ = 0;
    
      
      //20200206: Prediction
      // Clear Old Segment
      this.segments_ = [];
      this.appendNewSegment_();
      this.focusedSegmentIndex_ = 0;
      // Start Predict
      this.state_ = sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION;
      this.predictCandidates_();
      this.predicting_ = true;
      this.update_(); // It is a loop.
  }
  else {
      this.commitText_ = null;
  }
  
};

/**
 * Updates output using IME Extension API.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.update_ = function() {
    
  console.log('%%%%%%%%%%%%%%%%%%%%% Running update_ function %%%%%%%%%%%%%%%%%%%%')
  this.updatePreedit_();
  this.updateCandidates_();
  
  // updateCommitText_ = Output Text on the screen.
  this.updateCommitText_();
  
  // what is the state before updateCommitText_()?
  // For updateCandidates_ :
  // if state = PRECOMPOSITION, candidate window = invisible
  
  // For updateCommitText_:
  // if state = PRECOMPOSITION, do Nothing
  // else -> clear (-> turn to PRECOMPOSITION State)
  
  // NOW predictCandidates -> For state PRECOMPOSITION -> do nothing.
  /*
  console.log('*** predict ***');
  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION;
  this.predictCandidates_();
  this.updatePreedit_();
  this.updateCandidates_();
  this.updateCommitText_();
  */
  console.log('%%%%%%%%%%%%%%%%%%%%% Finish Running update_ function %%%%%%%%%%%%%%%%%%%%')

};

/**
 * Commits a preedit text and clears a context.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.commit_ = function() {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return;
  }
  console.log('******************************* Running commit_ function ****************')
  var commitText = this.getPreeditText_();
  
  ///////////////////////////////////////// 20200207 freq 
  if (this.useFrequency_) {
      var sql_update_freq = "UPDATE ";
      console.log(g6database);
      
      // Current SQL Table
      this.usingSQLTable_ = this.getSQLTableInUse_();
        
      if (this.predicting_) {
          //commitText = this.inputText_ + commitText
          if (this.useSimplifiedChinese_) {
              sql_update_freq = sql_update_freq.concat("G6S2P SET Frequency = Frequency + 1 WHERE Character = '")
          }
          else {
              sql_update_freq = sql_update_freq.concat("G6T2P SET Frequency = Frequency + 1 WHERE Character = '")
          }
          sql_update_freq = sql_update_freq.concat(this.inputText_ + commitText).concat("';")
          console.log("To Update Freq (Predicting): ", this.inputText_ + commitText)
      }
      else {
          sql_update_freq = sql_update_freq.concat(this.usingSQLTable_)
          sql_update_freq = sql_update_freq.concat(" SET Frequency = Frequency + 1 WHERE Character = '")
          sql_update_freq = sql_update_freq.concat(commitText).concat("';")
          console.log("To Update Freq (Not Predicting): ", commitText)
      }
    
    console.log(sql_update_freq);
    g6database.exec(sql_update_freq);
    console.log('************************** Frequency Updated.')
    
    /////////////////
    // Exec SQL Again For Updated Detail, and treat it as an object for push.
    var table_freq = "";
    var sql_select_freq_detail = "SELECT * FROM ";
    if (this.predicting_) {
        if (this.useSimplifiedChinese_) {
            table_freq = "G6S2P";
        }
        else {
            table_freq = "G6T2P"
        }
        sql_select_freq_detail = sql_select_freq_detail.concat(table_freq).concat(" WHERE CHARACTER = '")
                                .concat(this.inputText_ + commitText).concat("';");
    } else {
        table_freq = this.usingSQLTable_
        sql_select_freq_detail = sql_select_freq_detail.concat(table_freq)
                                .concat(" WHERE CHARACTER = '").concat(commitText).concat("';");
    }
    var contents_detail = chrome.extension.getBackgroundPage().g6database.exec(sql_select_freq_detail);
    var splitContent = contents_detail[0].values[0].toString().split(',');
    if ((table_freq == "G6TCF") || (table_freq == "G6SCF")){
        var objMyFreq = { // for normal, many strokes! need other handle.
            table: table_freq,
            //id: splitContent[0],
            //code0: splitContent[1],
            //code1: splitContent[2],
            //code2: splitContent[3],
            //code3: splitContent[4],
            //code4: splitContent[5],
            //code5: splitContent[6],
            character: splitContent[31],
            frequency: splitContent[32]
            //favourite: splitContent[9]
        }
    }
    else {
        var objMyFreq = { 
            table: table_freq,
            //id: splitContent[0],
            //code0: splitContent[1],
            //code1: splitContent[2],
            //code2: splitContent[3],
            //code3: splitContent[4],
            //code4: splitContent[5],
            //code5: splitContent[6],
            character: splitContent[7],
            frequency: splitContent[8]
            //favourite: splitContent[9]
        }
    }
    var newFreqRecord = true;
    for (var i = 0; i < updateFreqList.length; i++) {
        if (updateFreqList[i].character == objMyFreq.character) {
            updateFreqList[i].frequency ++;
            newFreqRecord = false;
            break;
        }
    }
    if (newFreqRecord) {
        updateFreqList.push(objMyFreq);
    }
    
    //updateFreqList.push(objMyFreq);
    chrome.storage.sync.set({'freqList_update':updateFreqList}, function(){
        console.log(" ****** Updated Freq List Saved ******");
    });
    //////////////////
    
    
    
    
    
  }
  
  ////
  //20200206. remove clear for Prediction
  
  if (!this.usePrediction_) {
      this.clear_();
  }
  this.commitText_ = commitText;
  
  console.log('******************************** Finish Running commit_ function ****************')
};

/**
 * Inserts characters into the cursor position.
 * @param {string} value Text we want to insert into.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.insertCharacters_ =
    function(value) {
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    return;
  }

  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    this.appendNewSegment_();
    this.focusedSegmentIndex_ = 0;
  }


////////////////////////// 20200116 update for UIOJKL/JKLUIO/Left Hand
 if (this.useLeftSingleHand_)
 {
     if(this.useUIOJKL_) {
         if (value.match(/^[q]$/i)) {		// re-map UIOJKL to G6 code
            value = '一';
          } else if (value.match(/^[w]$/i)) {
            value = '丨';
          } else if (value.match(/^[e]$/i)) {
            value = '丿';
          } else if (value.match(/^[a]$/i)) {
            value = '丶';
          } else if (value.match(/^[s]$/i)) {
            value = 'フ';
          } else if (value.match(/^[d]$/i)) {
            value = '＊';
          } else if (value.match(/^[y]$/i)) { // keep this for left hand?
            
          }
     }
     else if (this.useJKLUIO_) {
         if (value.match(/^[a]$/i)) {		// re-map JKLUIO to G6 code
            value = '一';
          } else if (value.match(/^[s]$/i)) {
            value = '丨';
          } else if (value.match(/^[d]$/i)) {
            value = '丿';
          } else if (value.match(/^[q]$/i)) {
            value = '丶';
          } else if (value.match(/^[w]$/i)) {
            value = 'フ';
          } else if (value.match(/^[e]$/i)) {
            value = '＊';
          } else if (value.match(/^[y]$/i)) {
            
          }
     }
 }
 else { // Right hand to type stroke
     if(this.useUIOJKL_) {
         if (value.match(/^[u]$/i)) {		// re-map UIOJKL to G6 code
            value = '一';
          } else if (value.match(/^[i]$/i)) {
            value = '丨';
          } else if (value.match(/^[o]$/i)) {
            value = '丿';
          } else if (value.match(/^[j]$/i)) {
            value = '丶';
          } else if (value.match(/^[k]$/i)) {
            value = 'フ';
          } else if (value.match(/^[l]$/i)) {
            value = '＊';
          } else if (value.match(/^[y]$/i)) {
            
          }
     }
     else if (this.useJKLUIO_) {
         if (value.match(/^[j]$/i)) {		// re-map JKLUIO to G6 code
            value = '一';
          } else if (value.match(/^[k]$/i)) {
            value = '丨';
          } else if (value.match(/^[l]$/i)) {
            value = '丿';
          } else if (value.match(/^[u]$/i)) {
            value = '丶';
          } else if (value.match(/^[i]$/i)) {
            value = 'フ';
          } else if (value.match(/^[o]$/i)) {
            value = '＊';
          } else if (value.match(/^[y]$/i)) {
            
          }
     }
 }
 
 //////////////////////////////////
  var text = this.inputText_;
  this.inputText_ =
      text.substr(0, this.cursor_) + value + text.substr(this.cursor_);
  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION;
  this.moveCursor_(this.cursor_ + value.length);
  
  //20200208
  // Clear Old Segment
  this.segments_ = [];
  this.appendNewSegment_();
  this.focusedSegmentIndex_ = 0;
  
  this.generateCandidates_();
};

/**
 * Removes a character.
 * @param {number} index index of the character you want to remove.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.removeCharacter_ =
    function(index) {
  if (this.state_ != sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION) {
    return;
  }

  if (index < 0 || this.inputText_.length <= index) {
    return;
  }

  this.inputText_ =
      this.inputText_.substr(0, index) + this.inputText_.substr(index + 1);

  if (this.inputText_.length == 0) {
    this.clear_();
    return;
  }

  if (index < this.cursor_) {
    this.moveCursor_(this.cursor_ - 1);
  }

  this.generateCandidates_();
};

/**
 * Moves a cursor position.
 * @param {number} index Cursor position.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.moveCursor_ = function(index) {
  if (this.state_ != sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION) {
    return;
  }

  if (index < 0 || this.inputText_.length < index) {
    return;
  }

  this.cursor_ = index;
};

/**
 * Expands a focused segment.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.expandSegment_ = function() {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return;
  }

  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.CONVERSION;

  var index = this.focusedSegmentIndex_;
  var segments = this.segments_;
  if (index + 1 >= segments.length) {
    return;
  }

  if ((index + 2 == segments.length &&
       segments[index + 1].start + 1 == this.inputText_.length) ||
      (index + 2 < segments.length &&
       segments[index + 1].start + 1 == segments[index + 2].start)) {
    segments.splice(index + 1, 1);
  } else {
    ++segments[index + 1].start;
    this.generateCandidates_(index + 1);
  }

  this.generateCandidates_();
};

/**
 * Shrinks a focused segment.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.shrinkSegment_ = function() {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return;
  }

  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.CONVERSION;

  var segments = this.segments_;
  var index = this.focusedSegmentIndex_;

  if (index + 1 == segments.length) {
    if (this.inputText_.length - segments[index].start > 1) {
      this.appendNewSegment_();
      segments[index + 1].start = this.inputText_.length - 1;
      this.generateCandidates_();
      this.generateCandidates_(index + 1);
    }
  } else {
    if (segments[index + 1].start - segments[index].start > 1) {
      --segments[index + 1].start;
      this.generateCandidates_();
      this.generateCandidates_(index + 1);
    }
  }
};

/**
 * Resets a segmentation data of the preedit text.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.resetSegments_ = function() {
  if (this.state_ != sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    return;
  }
  

  this.segments_ = [];
  this.appendNewSegment_();
  this.focusedSegmentIndex_ = 0;
  this.generateCandidates_();
  //console.log('reset segment. generate Candidate !!!!****')
  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.COMPOSITION;
  
};

/**
 * Selects a candidate.
 * @param {number} candidateID index of the candidate.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.focusCandidate_ =
    function(candidateID) {
  if (this.state_ ==
      sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
    return;
  }

  var segment = this.segments_[this.focusedSegmentIndex_];
  if (candidateID < 0 || segment.candidates.length <= candidateID) {
    return;
  }

  segment.focusedIndex = candidateID;
  this.state_ = sampleImeForImeExtensionApi.SampleIme.State.CONVERSION;
};

/**
 * Focuses a segment.
 * @param {number} segmentID index of the segment.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.focusSegment_ =
    function(segmentID) {
  if (this.state_ != sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    return;
  }

  if (segmentID < 0 || this.segments_.length <= segmentID) {
    return;
  }

  this.focusedSegmentIndex_ = segmentID;
};

function changeTable(){
    if(useSixStroke_){ //table is G6TC
        return;
    }
}

/**
 * Handles a alphabet key.
 * @param {!Object} keyData key event data.
 * @return {boolean} true if key event is consumed.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.handleKey_ = function(keyData) {
  var keyValue = keyData.key;
  console.log('====> HandleKey: Key is pressed: ' + keyValue)
    if (keyData.altKey || keyData.ctrlKey || keyData.shiftKey) {
      console.log('====> HandleKey: SpecialKey pressed: ' + keyValue)
    return false;
    }

    if (!this.useChineseInput_) {		// ignore input if Chinese input disable
	return false;
  }

  if (!keyValue.match(/^[a-z]$/i)) { //if not a-z key
    return false;
  }else{
      
      //20200208
      // Clear Predicting when entering any character command
      if (this.predicting_) {
           this.predicting_ = false;
           this.inputText_ = '';
           //this.segments_ = [];
      }
      
      
      // 20191024 SAM：
      // ======== When keyboard command sent, update radio menu
      
      if((keyValue.match(/^[y]$/i) && (!this.useLeftSingleHand_)) || 
        (keyValue.match(/^[r]$/i) && this.useLeftSingleHand_)){
         // console.log ("y is pressed in handleKey()");
          
          if (this.useSixStroke_){
              this.useSixStroke_ = false;
              //console.log('this.engineID_ = ' + this.engineID_ )
              this.onMenuItemActivated(this.engineID_, 'enable_six_stroke')
              console.log('=================> Turn Off Six Stroke')
              //this.enableSixStroke_.checked = false;
              console.log("useSixStroke_ = " + this.useSixStroke_ );
          }else {
              this.useSixStroke_ = true;
              this.use2WordPhrase_ = false;
              this.use3WordPhrase_ = false;
              this.useMWordPhrase_ = false;
              this.usePunctuation_ = false;
              //this.enableSixStroke_.checked = true;
              this.onMenuItemActivated(this.engineID_, 'enable_six_stroke')
              console.log('=================> Turn On Six Stroke')
              console.log("useSixStroke_ = " + this.useSixStroke_ );
          }
          //this.menuItemCallbackTable_[this.enableSixStroke_.id];
          return true;
      } else if((keyValue.match(/^[h]$/i) && (!this.useLeftSingleHand_)) || 
                (keyValue.match(/^[f]$/i) && this.useLeftSingleHand_)){
            //console.log ("h is pressed in handleKey()");
          
          if (this.use2WordPhrase_){
              this.use2WordPhrase_ = false;
              this.onMenuItemActivated(this.engineID_, 'enable_2_word_phrase_mode')
              console.log('=================> Turn Off 2 Word Phrase Mode')
              //this.enableSixStroke_.checked = false;
              console.log("use2WordPhrase_ = " + this.use2WordPhrase_ );
          }else {
              this.use2WordPhrase_ = true;
              this.useSixStroke_ = false;
              this.use3WordPhrase_ = false;
              this.useMWordPhrase_ = false;
              this.usePunctuation_ = false;
              //this.enableSixStroke_.checked = true;
              this.onMenuItemActivated(this.engineID_, 'enable_2_word_phrase_mode')
              console.log('=================> Turn On 2 Word Phrase Mode')
              console.log("use2WordPhrase_ = " + this.use2WordPhrase_ );
          } 
        return true;
      } else if((keyValue.match(/^[n]$/i) && (!this.useLeftSingleHand_)) || 
           (keyValue.match(/^[c]$/i) && this.useLeftSingleHand_)){
            //console.log ("n is pressed in handleKey()");
          
          if (this.use3WordPhrase_){
              this.use3WordPhrase_ = false;
              //this.enableSixStroke_.checked = false;
              this.onMenuItemActivated(this.engineID_, 'enable_3_word_phrase_mode')
              console.log('=================> Turn Off 3 Word Phrase Mode')
              console.log("use3WordPhrase_ = " + this.use3WordPhrase_ );
          }else {
              this.use3WordPhrase_ = true;
              this.useSixStroke_ = false;
              this.use2WordPhrase_ = false;
              this.useMWordPhrase_ = false;
              this.usePunctuation_ = false;
              //this.enableSixStroke_.checked = true;
              this.onMenuItemActivated(this.engineID_, 'enable_3_word_phrase_mode')
              console.log('=================> Turn On 3 Word Phrase Mode')
              console.log("use3WordPhrase_ = " + this.use3WordPhrase_ );
          }
          return true;
      } else if((keyValue.match(/^[m]$/i) && (!this.useLeftSingleHand_)) || 
                (keyValue.match(/^[x]$/i) && this.useLeftSingleHand_)){
                 console.log ("m is pressed in handleKey()");
          
          if (this.useMWordPhrase_){
              this.useMWordPhrase_ = false;
              //this.enableSixStroke_.checked = false;
              this.onMenuItemActivated(this.engineID_, 'enable_M_word_phrase_mode')
              console.log('=================> Turn Off 3 Word Phrase Mode')
              console.log("useMWordPhrase_ = " + this.useMWordPhrase_ );
          }else {
              this.useMWordPhrase_ = true;
              this.useSixStroke_ = false;
              this.use2WordPhrase_ = false;
              this.use3WordPhrase_ = false;
              this.usePunctuation_ = false;
              //this.enableSixStroke_.checked = true;
              this.onMenuItemActivated(this.engineID_, 'enable_M_word_phrase_mode')
              console.log('=================> Turn On M Word Phrase Mode')
              console.log("useMWordPhrase__ = " + this.useMWordPhrase__ );
          }
          return true;
      } else if (keyValue.match(/^[p]$/i)) {
          console.log("p is pressed in handleKey()");
          if (this.usePunctuation_){
              this.usePunctuation_ = false;
              this.onMenuItemActivated(this.engineID_, 'enable_punctuation_mode')
              console.log('=================> Turn Off Punctuation Mode')
              console.log("usePunctuation_ = " + this.usePunctuation_ );
          }else {
              this.usePunctuation_ = true;
              this.useSixStroke_ = false;
              this.use2WordPhrase_ = false;
              this.use3WordPhrase_ = false;
              this.useMWordPhrase_ = false;
          }
          return true;
      } else if ((!this.useLeftSingleHand_) && (keyValue.match(/^[u|i|o|j|k|l]$/i))) {
          console.log("Hello "+ keyValue);
          this.insertCharacters_(keyValue);
          this.update_();
          return true;
      } else if ((this.useLeftSingleHand_) && (keyValue.match(/^[q|w|e|a|s|d]$/i))) {
          console.log("Hello "+ keyValue);
          this.insertCharacters_(keyValue);
          this.update_();
          return true;
      } 
      
      
      
      /*else if (keyValue.match(/^[e]$/i)){
          console.log("e pressed, useChineseInput_ = " + this.useChineseInput_);
          if (this.useChineseInput_){
          this.useChineseInput_=false;
          }else {
              this.useChineseInput_=true;
          }
      } */
      
  }
  
  //NOTE: Use keyData.code instead of keyData.key better
  //console.log(keyData);
  
  
  /* if (!keyValue.match(/^[u|i|o|j|k|l]$/i)) {
    return false;
  } */

  
  
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
    this.commit_();
  }

  //this.insertCharacters_(keyValue);

  this.update_();

  return true;
};


/**
 * Handles a non-alphabet key.
 * @param {!Object} keyData key event data.
 * @return {boolean} true if key event is consumed.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.handleSpecialKey_ =
    function(keyData) {
        console.log('=====> Handle Special Key: Current State: ' + this.state_)
        console.log('=====> Handle Special Key: Key pressed: '+ keyData.key)
        
  // 20191028: PRECOMPOSITION = Segment has not appeared now! (No Stroke)
  if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
      // Candidate Window Not yet Appear by User Input. 
      // But just to Handle Shift Key on Changing English
        if (keyData.key === "Shift"){ // 20200415 Shift Handle: Change to English
          if (this.useChineseInput_){
              this.useChineseInput_ = false;
              this.onMenuItemActivated(this.engineID_, 'input_language_is_chinese');
              console.log(" ****** Shift Key Pressed. Change to English. ******");
          }
          else {
              this.useChineseInput_ = true;
              this.onMenuItemActivated(this.engineID_, 'input_language_is_chinese');
              console.log(" ****** Shift Key Pressed. Change to Chinese. ******");
          }
      }
      
    return false;
  }

  var segment = this.segments_[this.focusedSegmentIndex_];
  

  
  
  
  /*
  Below Code Unknown (20200415)
  
  if (keyData.shiftKey === true){ // Handle Shift
      // ***** Old Code ******
      // this.useChineseInput_ = true;
      
      // 20191028 Modify
      // At Below have other shift code. Delete?
      // If Not PRECOMPOSITION => ChineseInput must be true (Inputting)
      if (this.useChineseInput_) {
          
        // Close Candidate Window. *** But still have some text here?
         if (this.usePrediction_) {
            this.predicting_ = false;
            console.log("System: Predicting: Turn Off ");
        }  
        
        chrome.input.ime.setCandidateWindowProperties({
            engineID: this.engineID_,
            properties: {
                visible: false,
                auxiliaryTextVisible: false }},
        function(success) {
                console.log('Candidate window properties are updated. result=' + success);});
        // End of Close Candiate Window =============================
        
        this.useChineseInput_ = false
        this.onMenuItemActivated(this.engineID_, 'input_language_is_chinese')
        console.log("===================> Turn Off Chinese Input")
        
      }
      
      console.log("Shift pressed, useChineseInput_ = " + this.useChineseInput_);
  }
  */
  //if (!keyData.altKey && !keyData.ctrlKey && !keyData.shiftKey) {
  if (!keyData.altKey && !keyData.ctrlKey) {    
    var PAGE_SIZE = sampleImeForImeExtensionApi.SampleIme.PAGE_SIZE_;
    switch (keyData.key) {
    
    //****************** 20191022 Sam ( number 1 to 9 input) //20200205 0 to 2.
    case '0':
        if (this.useSingleHand_) {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) ;
            console.log("=============> 0 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        else {
            // Left Single Hand / Two Hands No 0. Do Nothing.
        }
        
        break;
    
    case '1':
        if (this.useSingleHand_) {
            // Right Single Hand No 1. Do Nothing.
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) ;
            console.log("=============> 1 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                
                this.commit_();
                
                console.log('number key 1 finish commit');
                
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        
        break;
    
    case '2':
        if (this.useSingleHand_) {
            // Right Single Hand 2 = Normal 9.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 8;
            console.log("=============> 2 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 1;
            console.log("=============> 2 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    case '3':
          if (this.useSingleHand_) {
            // Right Single Hand 3 = Normal 8.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 7;
            console.log("=============> 3 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 2;
            console.log("=============> 3 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    case '4':
          if (this.useSingleHand_) {
            // Right Single Hand 4 = Normal 7.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 6;
            console.log("=============> 4 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 3;
            console.log("=============> 4 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    
    case '5':
          if (this.useSingleHand_) {
            // Right Single Hand 5 = Normal 6.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 5;
            console.log("=============> 5 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 4;
            console.log("=============> 5 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    
    case '6':
        if (this.useSingleHand_) {
            // Right Single Hand 6 = Normal 5.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 4;
            console.log("=============> 6 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 5;
            console.log("=============> 6 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    case '7':
        if (this.useSingleHand_) {
            // Right Single Hand 7 = Normal 4.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 3;
            console.log("=============> 7 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 6;
            console.log("=============> 7 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    
    case '8':
        if (this.useSingleHand_) {
            // Right Single Hand 8 = Normal 2.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 2;
            console.log("=============> 8 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 7;
            console.log("=============> 8 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
        
    case '9':
        if (this.useSingleHand_) {
            // Right Single Hand 9 = Normal 1.
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 1;
            console.log("=============> 9 Pressed (Right Single Hand). Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
            
        }
        else {
            var target_index = PAGE_SIZE*Math.floor(segment.focusedIndex/PAGE_SIZE) + 8;
            console.log("=============> 9 Pressed. Jump to index: " + target_index)
            if (target_index < segment.candidates.length) {
                this.focusCandidate_(target_index);
                this.commit_();
            }
            else {
                console.log("!!!!! ======> " + target_index + " out of bound !")
            }
        }
        break;
    
    //****************** 20191022 Sam    
    
    case 'Shift':
        if (this.useChineseInput_){
              this.useChineseInput_ = false;
              this.onMenuItemActivated(this.engineID_, 'input_language_is_chinese');
              console.log(" ****** Shift Key Pressed. Change to English. ******");
        }
        else {
              this.useChineseInput_ = true;
              this.onMenuItemActivated(this.engineID_, 'input_language_is_chinese');
              console.log(" ****** Shift Key Pressed. Change to Chinese. ******");
        }
          
      if (this.state_ == sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
        this.resetSegments_();
      } else {
            while (this.cursor_ != 0) {
                this.removeCharacter_(this.cursor_ - 1);
            }
      }
      break;
    
    
    case 'Backspace':
      if (this.state_ ==
          sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
        this.resetSegments_();
      } else if (this.cursor_ != 0) {
        this.removeCharacter_(this.cursor_ - 1);
      }
      break;
    case 'Delete':
      if (this.state_ ==
          sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
        this.resetSegments_();
      } else if (this.cursor_ != this.inputText_.length) {
        this.removeCharacter_(this.cursor_);
      }
      break;
    case 'Up':
      var previous_index = segment.focusedIndex - 1;
      if (previous_index == -1) {
        previous_index = segment.candidates.length - 1;
      }
      console.log("=============> Up pressed. Now index: " + previous_index)
      this.focusCandidate_(previous_index);
      break;
    case 'Down':
    case ' ':
      var next_index = segment.focusedIndex + 1;
      if (next_index == segment.candidates.length) {
        next_index = 0;
      }
      console.log("============> Down pressed. Now index: " + next_index)
      this.focusCandidate_(next_index);
      break;
    case 'Left':
    /*    
    // Old Function. (Switching cursor position between typed stroke.)
      if (this.state_ ==
          sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
        if (this.focusedSegmentIndex_ != 0) {
          this.focusSegment_(this.focusedSegmentIndex_ - 1);
        }
      } else {
        this.moveCursor_(this.cursor_ - 1);
      }
    */
    var target_index = PAGE_SIZE*(Math.floor(segment.focusedIndex/PAGE_SIZE) - 1);
        if (target_index < 0) {
            target_index = PAGE_SIZE*(Math.floor(segment.candidates.length/PAGE_SIZE));
        }
        this.focusCandidate_(target_index);
        console.log("=============> Left Pressed. Jump to Prev Page Index: " + target_index)
      break;
    case 'Right':
    /*
    // Old Function. (Switching cursor position between typed stroke.)
      if (this.state_ ==
          sampleImeForImeExtensionApi.SampleIme.State.CONVERSION) {
        if (this.focusedSegmentIndex_ + 1 != this.segments_.length) {
          this.focusSegment_(this.focusedSegmentIndex_ + 1);
        }
      } else {
        this.moveCursor_(this.cursor_ + 1);
      }
    */
    var target_index = PAGE_SIZE*(Math.floor(segment.focusedIndex/PAGE_SIZE) + 1);
        if (target_index > segment.candidates.length) {
            target_index = 0;
        }
        this.focusCandidate_(target_index);
        console.log("=============> Right Pressed. Jump to Next Page Index: " + target_index)
      break;
    case 'Enter':
      this.commit_();
      break;
    default:
      return true;
    }
  } 
  
  else if (!keyData.altKey && !keyData.ctrlKey && keyData.shiftKey) {
    switch (keyData.key) {
    case 'shift':
      if (this.state_ !=
          sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
        this.shrinkSegment_();
        console.log("Shift is pressed.");
        //this.useChineseInput_ = false;
      }
      break;
    case 'Right':
      if (this.state_ !=
          sampleImeForImeExtensionApi.SampleIme.State.PRECOMPOSITION) {
        this.expandSegment_();
        console.log("RShift is pressed.");
      }
      break;
    default:
      return true;
    }
  } 
  
  else {
    return true;
  }
  
  
  
  
  console.log('*** Run Update')
  this.update_();
  

  
  
  return true;
};

/**
 * Sets up a menu on a uber tray.
 * @private
 */
sampleImeForImeExtensionApi.SampleIme.prototype.setUpMenu_ = function() {
  chrome.input.ime.setMenuItems({
    engineID: this.engineID_,
    items: this.menuItems_
  }, function() {
    console.log('Menu items are set.');
  });
};

/**
 * Callback method. It is called when IME is activated.
 * @param {string} engineID engine ID.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onActivate =
    function(engineID) {
  this.engineID_ = engineID;
  this.clear_();
  this.setUpMenu_();
};

/**
 * Callback method. It is called when IME is deactivated.
 * @param {string} engineID engine ID.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onDeactivated =
    function(engineID) {
  this.clear_();
  this.engineID_ = '';
};

/**
 * Callback method. It is called when a context acquires a focus.
 * @param {!Object} context context information.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onFocus = function(context) {
  this.context_ = context;
  this.clear_();
};

/**
 * Callback method. It is called when a context lost a focus.
 * @param {number} contextID ID of the context.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onBlur = function(contextID) {
  this.clear_();
  this.context_ = null;
};

/**
 * Callback method. It is called when properties of the context is changed.
 * @param {!Object} context context information.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onInputContextUpdate =
    function(context) {
  this.context_ = context;
  if (!this.isImeEnabled_()) {
    this.clear_();
  }

  this.update_();
};

/**
 * Callback method. It is called when IME catches a new key event.
 * @param {string} engineID ID of the engine.
 * @param {!Object} keyData key event data.
 * @return {boolean} true if the key event is consumed.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onKeyEvent =
    function(engineID, keyData) {
  if (keyData.type != 'keydown' || !this.isImeEnabled_()) {
    return false;
  }

  var key = this.stringifyKeyAndModifiers_(keyData);
  if (sampleImeForImeExtensionApi.SampleIme.IGNORABLE_KEY_SET_[key]) {
    return false;
  }

  return this.handleKey_(keyData) || this.handleSpecialKey_(keyData) 
};

/**
 * Callback method. It is called when candidates on candidate window is clicked.
 * @param {string} engineID ID of the engine.
 * @param {number} candidateID Index of the candidate.
 * @param {string} button Which mouse button was clicked.
 */
sampleImeForImeExtensionApi.SampleIme.prototype.onCandidateClicked =
    function(engineID, candidateID, button) {
  if (button == 'left') {
    this.focusCandidate_(candidateID);
    this.update_();
  }
};

/**
 * Callback method. It is called when menu item on uber tray is activated.
 * @param {string} engineID ID of the engine.
 * @param {string} name name of the menu item.
 */
 
 // 20191024 Sam: When clicked on radio menu, run this function
sampleImeForImeExtensionApi.SampleIme.prototype.onMenuItemActivated =
    function(engineID, name) {
  var callback = this.menuItemCallbackTable_[name];
  if (typeof(callback) != 'function') {
    return;
  }

  callback();

  chrome.input.ime.updateMenuItems({
    engineID: engineID,
    items: this.menuItems_
  }, function() {
      // 20191024 Sam
      // =================== console: =====================
      // Or need to run console early?
      // engineID = sample_ime_for_ime_extension_api
      // this.menuItems_ = undefined
      // name = radio menu item id ? E.g. input_language_is_chinese, enable_six_stroke
      // ===================================================
    console.log('Menu items are updated. name = ' + name );
  });
};

function ajax(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url); //async
    console.log(url);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function() {
      var status = xhr.status;
		if (status == 200) {
			var uInt8Array = new Uint8Array(this.response);
        	var db = new SQL.Database(uInt8Array);
        	resolve(db);
        	// contents is now [{columns:['col1','col2',...], values:[[first row], [second row], ...]}]
        }
    };
    xhr.onerror = reject;
    xhr.send();
  });
}
