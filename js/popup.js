// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE

$('#banben').text('v'+chrome.runtime.getManifest().version);
$('#refresh').click(function() {
    chrome.runtime.sendMessage({type:'set', key:'reload', value:'true'});
    $('#status').css('display','');
    $('#refresh').css('color','gray');
    $('#refresh span').css('color','gray');
    $('#refresh').css('pointer-events','none');   
});

