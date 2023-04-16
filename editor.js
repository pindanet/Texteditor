window.addEventListener('load', function() {
    var editor;
});
    ContentTools.StylePalette.add([
        new ContentTools.Style('Author', 'author', ['p'])
    ]);
    editor = ContentTools.EditorApp.get();
    // Define our request for the French translation file
    xhr = new XMLHttpRequest();
    xhr.open('GET', 'nl.json', true);
    
    function onStateChange (ev) {
        var translations;
        if (ev.target.readyState == 4) {
            // Convert the JSON data to a native Object
            translations = JSON.parse(ev.target.responseText);
            
            // Add the translations for the French language
            ContentEdit.addTranslations('nl', translations);
    
            // Set French as the editors current language
            ContentEdit.LANGUAGE = 'nl';
        }
    }
    
    xhr.addEventListener('readystatechange', onStateChange);
    
    // Load the language
    xhr.send(null);    
    
    editor.init('*[data-editable]', 'data-name');
    editor.addEventListener('saved', function (ev) {
    var name, payload, regions, xhr;

    // Check that something changed
    regions = ev.detail().regions;
    if (Object.keys(regions).length == 0) {
        return;
    }

    // Set the editor as busy while we save our changes
    this.busy(true);

    // Collect the contents of each region into a FormData instance
    payload = new FormData();
    for (name in regions) {
        if (regions.hasOwnProperty(name)) {
            payload.append(name, regions[name]);
        }
    }

// https://github.com/renat2985/ContentTools-PHP
    // Send the update content to the server to be saved
    function onStateChange(ev) {
        // Check if the request is finished
        if (ev.target.readyState == 4) {
            editor.busy(false);
            if (ev.target.status == '200') {
                // Save was successful, notify the user with a flash
                new ContentTools.FlashUI('ok');
            } else {
                // Save failed, notify the user with a flash
                new ContentTools.FlashUI('no');
            }
        }
    };

    xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', onStateChange);
    xhr.open('POST', '/save-my-page');
    xhr.send(payload);
});
