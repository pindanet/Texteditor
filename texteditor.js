// ToDo
// undo drag & drop
// loop contentEditable and create toolbar
// https://github.com/eligrey/l10n.js

const isValidUrl = urlString=> {
  try { 
  	return Boolean(new URL(urlString)); 
  }
  catch(e){ 
  	return false; 
  }
}
function nextContentEditable(el) {
  let nextSibling = el.parentElement;
  while (nextSibling.className !== "contentEditableToolbar") {
    nextSibling = nextSibling.parentElement;
  }
  while (nextSibling) {
    nextSibling = nextSibling.nextSibling;
    if (nextSibling.nodeType !== 3) {
      if (nextSibling.hasAttribute("contentEditable")) {
        break;
      }
    }
  }
  if (! nextSibling) {
    alert("Contenteditable element not Found. Must be on the same level as and after the button Div.");
  }
  return nextSibling;
}
var editHTMLCaretPos;
function editHTML(el) {
  let contentEditableEl = nextContentEditable(el);
  if (el.className !== "buttonActive") {
    el.className = "buttonActive";
    let textarea = document.createElement('textarea');
  	let text = document.createTextNode(contentEditableEl.innerHTML);
    editHTMLCaretPos = getCaretIndex(contentEditableEl);
 	  editHistory.push(['editHTML', contentEditableEl.innerHTML, editHTMLCaretPos]);
  	textarea.appendChild(text);
    textarea.setAttribute("style", "height:" + contentEditableEl.offsetHeight + "px; width:" + contentEditableEl.clientWidth + "px; border-width: 0px; padding: 0px;");
    textarea.setAttribute("id","PindaHTMLarea");
    contentEditableEl.parentNode.insertBefore(textarea, contentEditableEl.nextSibling);
    contentEditableEl.style.display = "none";
  } else {
    el.className = "";
    contentEditableEl.style.display = "";
    contentEditableEl.innerHTML = document.getElementById("PindaHTMLarea").value;
    document.getElementById("PindaHTMLarea").remove();
    setCaretPosition(contentEditableEl, editHTMLCaretPos);
  }
}

const editHistory = [];
function undo(buttonEl) {
  let el;
  if (editHistory.length > 0) {
    let newRange = new Range();
    let selection = window.getSelection();
    let lastAction = editHistory.pop();
    selection.removeAllRanges();
    switch(lastAction[0]) {
      case 'editHTML':
        let contentEditableEl = nextContentEditable(buttonEl);
        contentEditableEl.innerHTML = lastAction[1];
        setCaretPosition(contentEditableEl, lastAction[2]);
        return;
//        newRange.selectNodeContents(contentEditableEl);
        break;
      case 'link':
        el = document.getElementById(lastAction[1]);
        el.innerHTML = lastAction[2];
        newRange.selectNodeContents(el);
        break;
      case 'Until':
        lastAction = editHistory.pop();
        newRange.setEnd(document.getElementById(lastAction[0]).firstChild, document.getElementById(lastAction[0]).firstChild.textContent.length);
        do {
          el = document.getElementById(lastAction[0]);
          el.style.cssText = lastAction[1];
          newRange.setStart(el, 0);
          lastAction = editHistory.pop();
        } while (lastAction[0] !== 'Repeat');
        break;
      default:
        el = document.getElementById(lastAction[0]);
        el.style.cssText = lastAction[1];
    }
    // Select undo range
    selection.addRange(newRange);
  }
}

EditedElementCounter = 0;
function addToHistory(el) {
  if (! el.id) {
    el.setAttribute("id", "PinDaEdited" + EditedElementCounter++);
  }
  editHistory.push([el.id, el.style.cssText]);
}

function getCaretIndex(element) {
  let position = 0;
  const isSupported = typeof window.getSelection !== "undefined";
  if (isSupported) {
    const selection = window.getSelection();
    if (selection.rangeCount !== 0) {
      const range = window.getSelection().getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(element);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      position = preCaretRange.toString().length;
    }
  }
  return position;
}
function setCaretPosition(el, pos){
    // Loop through all child nodes
    for(var node of el.childNodes){
        if(node.nodeType == 3){ // we have a text node
            if(node.length >= pos){
                // finally add our range
                var range = document.createRange(),
                    sel = window.getSelection();
                range.setStart(node,pos);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                return -1; // we are done
            }else{
                pos -= node.length;
            }
        }else{
            pos = setCaretPosition(node,pos);
            if(pos == -1){
                return -1; // no need to finish the for loop
            }
        }
    }
    return pos; // needed because of recursion stuff
}
function styleNodes(el, styleName, setStyle, delStyle) {
  var range = window.getSelection().getRangeAt(0);
  if (range.toString().length === 0) {
    alert("Nothing selected!");
    return;
  }

  editHistory.push(["Repeat"]);

  var _iterator = document.createNodeIterator(
    range.commonAncestorContainer,
    NodeFilter.SHOW_ALL, // pre-filter
    {
      // custom filter
      acceptNode: function (node) {
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  var _nodes = [];
  var styleElements = [];
  // selected text within one element
  if (range.startContainer == range.endContainer) {
    _iterator.nextNode();
    newNode = _iterator.referenceNode;
    if (_iterator.referenceNode.nodeType === 3) {
      newNode = _iterator.referenceNode.splitText(range.startOffset);
      selectedNode = newNode.splitText(range.endOffset);
    }
    styleElements.push(newNode);
  } else { // selected text over multiple elements
    while (_iterator.nextNode()) {
      if (_nodes.length === 0 && _iterator.referenceNode !== range.startContainer) continue;
      _nodes.push(_iterator.referenceNode);
      if (_iterator.referenceNode.nodeType == 3) {
        if (_iterator.referenceNode == range.startContainer) {
          newNode = _iterator.referenceNode.splitText(range.startOffset);
          continue;
        }
        if (_iterator.referenceNode == range.endContainer) {
          newNode = _iterator.referenceNode.splitText(range.endOffset);
        }
        styleElements.push(_iterator.referenceNode);
      }
      if (_iterator.referenceNode === range.endContainer) break;
    }
  }

  rangeStartNode =  styleElements[0];
  for (var i = 0; i < styleElements.length; i++) {
    // Selection already formatted
    if (styleElements[i].parentElement.id.substr(0, 11) == "PinDaEdited"  && styleElements[i].parentElement.textContent == styleElements[i].textContent) {
      addToHistory(styleElements[i].parentElement);
      if (styleElements[i].parentElement.style[styleName] !== setStyle) {
        styleElements[i].parentElement.style[styleName] = setStyle;
      } else {
        styleElements[i].parentElement.style[styleName] = delStyle;
      }
      rangeEndNode = styleElements[i];
    } else { // fist time formatting
      if (styleElements[i].nodeType === 3) { // Textnode
        if (styleElements[i].textContent.length !== 0) {  // not empty
          var span = document.createElement('span');
          styleElements[i].after(span);
          span.appendChild(styleElements[i]);
          addToHistory(span);
          span.style[styleName] = setStyle;
          rangeEndNode = styleElements[i];
        }
      }
    }
  }
  // Select old range
  let newRange = new Range();
  let selection = window.getSelection();
  selection.removeAllRanges();
  newRange.setStart(rangeStartNode, 0);
  newRange.setEnd(rangeEndNode,rangeEndNode.textContent.length);
  selection.addRange(newRange);
  editHistory.push(["Until"]);
}
function getParagraph(selectedParent) {
// get block element for paragraph style
  while (selectedParent.nodeType !== 1) {
    selectedParent = selectedParent.parentNode;
  }
  let selectedParagraph = selectedParent;
  while (selectedParagraph.offsetWidth + selectedParagraph.getBoundingClientRect().left !== selectedParagraph.parentNode.offsetWidth + selectedParagraph.parentNode.getBoundingClientRect().left) {
    selectedParagraph = selectedParagraph.parentNode;
  }
  return selectedParagraph;
}
function setStyle( elem, propertyObject )
{
  for (var property in propertyObject)
    elem.style[property] = propertyObject[property];
}
function getSelectedParent() {
  if (!getSelection().getRangeAt(0).startContainer.offsetWidth) { // paragraph not fully selected
    return getSelection().getRangeAt(0).startContainer.parentElement;
  } else { // paragraph fully selected
    return getSelection().getRangeAt(0).startContainer;
  }
}
function setParagraph(styleParagraph) {
  editHistory.push(["Repeat"]);
  selectedParent = getSelectedParent();
  do {
    selectedParagraph = getParagraph(selectedParent);
    addToHistory(selectedParagraph);
    setStyle(selectedParagraph, styleParagraph);
    if (selectedParent === getSelection().getRangeAt(0).endContainer.parentElement) {
      break;
    }
    selectedParent = selectedParent.nextElementSibling;
    if (! selectedParent) {
      break;
    }
  } while (true);
  editHistory.push(["Until"]);
}
function watchColorPicker(event) {
  if (colorElement.data.search("font-color.svg") !== -1) {
    colorElement.contentDocument.firstElementChild.lastElementChild.attributes['stroke'].nodeValue = event.target.value;
    edit(colorElement, "fontcolor");
    return;
  }
  if (colorElement.data.search("font-background.svg") !== -1) {
    colorElement.contentDocument.firstElementChild.firstElementChild.attributes['fill'].nodeValue = event.target.value;
    edit(colorElement, "fontbackgroundcolor");
    return;
  }
}
let colorElement;
function edit(el, format) {
  let styleElement = "";
  let selectedParent = "";
  let selectedParagraph = "";
  switch(format) {
    case 'bold':
      styleNodes(el, "fontWeight", "bold", "");
      break;
    case 'italic':
      styleNodes(el, "fontStyle", "italic", "");
      break;     
    case 'underline':
      styleNodes(el, "textDecoration", "underline", "");
      break;
    case 'color':
      colorElement = el.previousElementSibling;
      colorinput = document.getElementById('colorPicker');
      if (colorElement.data.search("font-color.svg") !== -1) {
        colorinput.value = colorElement.contentDocument.firstElementChild.lastElementChild.attributes['stroke'].nodeValue;
      }
      if (colorElement.data.search("font-background.svg") !== -1) {
        colorinput.value = colorElement.contentDocument.firstElementChild.firstElementChild.attributes['fill'].nodeValue;
      }
      colorinput.focus();
      colorinput.click();
      break;
    case 'fontcolor':
      styleNodes(el, "color", el.contentDocument.firstElementChild.lastElementChild.attributes['stroke'].nodeValue, el.contentDocument.firstElementChild.lastElementChild.attributes['stroke'].nodeValue);
      break;
    case 'fontbackgroundcolor':
      styleNodes(el, "backgroundColor", el.contentDocument.firstElementChild.firstElementChild.attributes['fill'].nodeValue, el.contentDocument.firstElementChild.firstElementChild.attributes['fill'].nodeValue);
      break;
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/color     
    case 'code':
      styleNodes(el, "fontFamily", "monospace", "");
      break;
// https://www.w3schools.com/cssref/css_default_values.php
    case 'pre':
      setParagraph({'fontFamily':'monospace', 'fontSize':'1em','fontWeight':'normal', 'whiteSpace':'pre', 'margin':'1em 0'});
      break;
    case 'p':
      setParagraph({'fontFamily':'', 'fontSize':'1em','fontWeight':'normal', 'whiteSpace':'', 'margin':'1em 0 1em 0'});
      break;
    case 'h1':
      setParagraph({'fontFamily':'', 'fontSize':'2em','fontWeight':'bold', 'whiteSpace':'', 'margin':'0.67em 0 0.67em 0'});
      break;
    case 'h2':
      setParagraph({'fontFamily':'', 'fontSize':'1.5em','fontWeight':'bold', 'whiteSpace':'', 'margin':'0.83em 0 0.83em 0'});
      break;
    case 'h3':
      setParagraph({'fontFamily':'', 'fontSize':'1.17em','fontWeight':'bold', 'whiteSpace':'', 'margin':'1em 0 1em 0'});
      break;
    case 'h4':
      setParagraph({'fontFamily':'', 'fontSize':'1em','fontWeight':'bold', 'whiteSpace':'', 'margin':'1.33em 0 1.33em 0'});
      break;
    case 'h5':
      setParagraph({'fontFamily':'', 'fontSize':'0.83em','fontWeight':'bold', 'whiteSpace':'', 'margin':'1.67em 0 1.67em 0'});
      break;
    case 'h6':
      setParagraph({'fontFamily':'', 'fontSize':'0.67em','fontWeight':'bold', 'whiteSpace':'', 'margin':'2.33em 0 2.33em 0'});
      break;
    case 'center':
      setParagraph({'textAlign':'center'});
      break;
    case 'left':
      setParagraph({'textAlign':'left'});
      break;
    case 'right':
      setParagraph({'textAlign':'right'});
      break;
    case 'justify':
      setParagraph({'textAlign':'justify'});
      break;
    case 'bulletedlist':
      selectedParent = getSelectedParent();
      selectedParagraph = getParagraph(selectedParent);
      if (selectedParagraph.style.display == 'list-item' && selectedParagraph.style.listStyleType == 'disc') {
        setParagraph({'display':''});
        // outdent
        edit(el, 'outdent');
        // remove outdent from undo buffer
        lastAction = editHistory.pop();
        do {
          el = document.getElementById(lastAction[0]);
          lastAction = editHistory.pop();
        } while (lastAction[0] !== 'Repeat');
      } else {
        setParagraph({'display':'list-item', 'listStyleType': 'disc', 'marginLeft':'1em'});
      }
      break;
    case 'numberedlist':
      selectedParent = getSelectedParent();
      selectedParagraph = getParagraph(selectedParent);
      if (selectedParagraph.style.display == 'list-item' && selectedParagraph.style.listStyleType == 'decimal') {
        setParagraph({'display':''});
        // outdent
        edit(el, 'outdent');
        // remove outdent from undo buffer
        lastAction = editHistory.pop();
        do {
          el = document.getElementById(lastAction[0]);
          lastAction = editHistory.pop();
        } while (lastAction[0] !== 'Repeat');
      } else {
        setParagraph({'display':'list-item', 'listStyleType': 'decimal', 'marginLeft':'1em'});
      }
      break;
    case 'indent':
      selectedParent = getSelectedParent();
      selectedParagraph = getParagraph(selectedParent);
      let indent = 1;
      if (selectedParagraph.style.marginLeft) {
        indent = parseInt(selectedParagraph.style.marginLeft) + 1;
      }
      setParagraph({'marginLeft': indent + 'em'});
      break;
    case 'outdent':
      selectedParent = getSelectedParent();
      selectedParagraph = getParagraph(selectedParent);
      let outdent = 0;
      if (selectedParagraph.style.marginLeft) {
        outdent = Math.max(0, parseInt(selectedParagraph.style.marginLeft) - 1);
      }
      setParagraph({'marginLeft': outdent + 'em'});
      break;
    case 'imgleft':
      addToHistory(imgElement);
      setStyle(imgElement, {'float':'', 'display':'block', 'marginLeft':'', 'marginRight':''});
      break;
    case 'imgcenter':
      addToHistory(imgElement);
      setStyle(imgElement, {'float':'', 'display':'block', 'marginLeft':'auto', 'marginRight':'auto'});
      break;
    case 'imginlineright':
      addToHistory(imgElement);
      setStyle(imgElement, {'float':'right', 'display':'', 'marginLeft':'0.3em', 'marginRight':''});
      break;
    case 'imginlineleft':
      addToHistory(imgElement);
      setStyle(imgElement, {'float':'left', 'display':'', 'marginLeft':'', 'marginRight':'0.3em'});
      break;
    case 'imgsmaller':
      addToHistory(imgElement);
      if (imgElement.style.width) {
        setStyle(imgElement, {'width': Math.max(parseInt(imgElement.naturalWidth * .1), parseInt(parseInt(imgElement.style.width) - imgElement.naturalWidth * .1)) + 'px'});
      } else {
        setStyle(imgElement, {'width': parseInt(imgElement.naturalWidth * .9) + 'px'});
      }
      break;
    case 'imgbigger':
      addToHistory(imgElement);
      let contentEditableEl = imgElement.parentElement;
      while (! contentEditableEl.hasAttribute("contentEditable")) {
        contentEditableEl = contentEditableEl.parentElement;
      }
      let maxImgSize = imgElement.naturalWidth;
      if (imgElement.naturalWidth > contentEditableEl.clientWidth) {
        maxImgSize = contentEditableEl.clientWidth;
      }
      if (imgElement.style.width) {
        setStyle(imgElement, {'width': Math.min(maxImgSize, parseInt(parseInt(imgElement.style.width) + imgElement.naturalWidth * .1)) + 'px'});
      } else {
        setStyle(imgElement, {'width': maxImgSize + 'px'});
      }
      break;
    case 'link':
      let range = getSelection().getRangeAt(0);
      let selectedClone = range.cloneContents();
      let linkText = range.toString();
      if (linkText.length === 0) {
        alert("Nothing selected!");
      } else {
        // check for link tag
        selectedParent = getSelectedParent();
        selectedParagraph = getParagraph(selectedParent);
        let editorHTML = selectedParagraph.innerHTML;
        let editorText = selectedParagraph.textContent;
        let caretPosition = getCaretIndex(selectedParagraph);
        let startPinDaEdited = editorHTML.indexOf('<a id="PinDaLink');
        let strippedLength;
        while (startPinDaEdited !== -1) {
          let prePindaEdited = editorHTML.substring(0, startPinDaEdited);
          strippedLength = prePindaEdited.replace( /(<([^>]+)>)/ig, '').length;
          if (caretPosition === strippedLength + range.toString().length) {
            let startIdPinDaEdited = editorHTML.indexOf('id="', startPinDaEdited) + 4;
            let endIdPinDaEdited = editorHTML.indexOf('"', startIdPinDaEdited);
            let idPinDaEdited = editorHTML.substring(startIdPinDaEdited, endIdPinDaEdited);

            editHistory.push(['link', selectedParagraph.id, selectedParagraph.innerHTML]);

            let linkEl = document.getElementById(idPinDaEdited);
            let pa = linkEl.parentNode;
            while(linkEl.firstChild) pa.insertBefore(linkEl.firstChild, linkEl);
            pa.removeChild(linkEl);
            alert("Link removed");
            return;
          }
          startPinDaEdited = editorHTML.indexOf('<a id="PinDaLink', startPinDaEdited + 1);
        }
          let link = prompt("Please enter the link for \"" + linkText + "\"", linkText);
          if (link == null) {
            break;
          } else {
            if (isValidUrl(link) == false) {
              alert("Invalid URL entered!");
              break;
            } else {
              styleElement = document.createElement('a');
              styleElement.innerHTML = linkText;
              styleElement.setAttribute("id", "PinDaLink" + EditedElementCounter++);
              styleElement.title = "Ctrl Click to test";
              styleElement.href = link;
              styleElement.target = "_blank";
              styleElement.onclick = function(e) {
                if (window.event.ctrlKey) {
                  window.open(e.target.href);
                }
              };
            }
          }
        if (! selectedParagraph.id) {
          selectedParagraph.setAttribute("id", "PinDaEdited" + EditedElementCounter++);
        }
        editHistory.push(['link', selectedParagraph.id, selectedParagraph.innerHTML]);
        range.deleteContents();
        range.insertNode(styleElement);
        // Select link element
        let selection = window.getSelection();
        selection.removeAllRanges();
        range.selectNodeContents(styleElement);
        selection.addRange(range);
      }
      break;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
// Options for the observer (which mutations to observe)
const config = { attributes: true, childList: true, subtree: true };

// Callback function to execute when mutations are observed
const callback = (mutationList, observer) => {
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      if (mutation.addedNodes.length > 0) {
        if (mutation.addedNodes[0].tagName === "IMG") {
          mutation.addedNodes[0].onclick = function() {imgButtonsOn(this)};
          mutation.addedNodes[0].title = "Click to (de)select";
          mutation.addedNodes[0].style.outlineStyle = "";
          mutation.addedNodes[0].onload = function() {
            let contentEditableEl = mutation.target;
            while (! contentEditableEl.hasAttribute("contentEditable")) {
              contentEditableEl = contentEditableEl.parentElement;
            }
            if (mutation.addedNodes[0].naturalWidth > contentEditableEl.clientWidth) {
              mutation.addedNodes[0].style.width = contentEditableEl.clientWidth + 'px';
            }
          };          
          imgButtonsOn(mutation.addedNodes[0]);
       }
      }
//    } else if (mutation.type === "attributes") {
//      console.log(`The ${mutation.attributeName} attribute was modified.`);
    }
  }
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
//observer.observe(targetNode, config);

// Later, you can stop observing
//observer.disconnect();
const undoTextCounter = [];
function contentEditableOnkeydown(event) {
  for (var i = 0; i < undoTextCounter.length; i++) {
    if (event.key == " " || event.key == ".") { // break at end of word or sentence
      if (event.target.textContent.length > undoTextCounter[i][1] + 9) { //at least 10 characters has been typed
        undoTextCounter[i][1] = event.target.textContent.length;
     	  editHistory.push(['editHTML', event.target.innerHTML, getCaretIndex(event.target)]);
      }
    }
  }
}
function contentEditableOndrop(event) {
  let contentEditableEl = event.target;
  while (! contentEditableEl.hasAttribute("contentEditable")) {
    contentEditableEl = contentEditableEl.parentElement;
  }
  editHistory.push(['editHTML', contentEditableEl.innerHTML, getCaretIndex(contentEditableEl)]);
}
let contentEditableEls = document.querySelectorAll('div[contentEditable]');
for (var i = 0; i < contentEditableEls.length; i++) {
  observer.observe(contentEditableEls[i], config);
  contentEditableEls[i].addEventListener("keydown", contentEditableOnkeydown);
  contentEditableEls[i].addEventListener("drop", contentEditableOndrop);
  undoTextCounter[i] = [contentEditableEls[i], contentEditableEls[i].textContent.length];
// initialize undo buffer.
  editHistory.push(['editHTML', contentEditableEls[i].innerHTML, 0]);
}
let imgElement;
function imgButtonsOn(el) {
  imgElement = el;
  let imgToolbars = document.getElementsByClassName("imgToolbar");
  for (var i = 0; i < imgToolbars.length; i++) {
    if (imgElement.style.outlineStyle !== "solid") {
      imgElement.style.outlineStyle = "solid";
      imgElement.style.outlineColor = "blue";
      imgToolbars[i].style.display = "";
    } else {
      imgElement.style.outlineStyle = "";
      imgElement.style.outlineColor = "";
      imgToolbars[i].style.display = "none";
    }
  }
}
