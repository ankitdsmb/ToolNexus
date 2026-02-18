function xmlToJson(xml) {
  var obj = {};

  if (xml.nodeType == 1) { // element
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    return xml.nodeValue.trim();
  }

  if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;

      if (item.nodeType === 3) {
           var text = item.nodeValue.trim();
           if (text === "") continue;

           if (obj["#text"]) obj["#text"] += text;
           else obj["#text"] = text;
      } else if (item.nodeType === 1) {
           var childJson = xmlToJson(item);

           if (typeof(obj[nodeName]) == "undefined") {
            obj[nodeName] = childJson;
           } else {
            if (!Array.isArray(obj[nodeName])) {
              var old = obj[nodeName];
              obj[nodeName] = [old];
            }
            obj[nodeName].push(childJson);
           }
      }
    }
  }

  var keys = Object.keys(obj);
  if (keys.length === 1 && keys[0] === "#text") {
      return obj["#text"];
  }

  return obj;
}

export async function runTool(action, input) {
  const normalizedAction = (action || 'convert').trim().toLowerCase();

  if (normalizedAction !== 'convert' && normalizedAction !== '') {
     throw new Error(`Unsupported action: ${action}`);
  }

  if (!input || !input.trim()) {
    return '';
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "text/xml");

    // Check for parser error
    const parserError = doc.querySelector("parsererror");
    if (parserError) {
       throw new Error(parserError.textContent || "Invalid XML");
    }

    const root = doc.documentElement;
    const json = {};
    json[root.nodeName] = xmlToJson(root);

    return JSON.stringify(json, null, 2);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`XML to JSON conversion failed: ${details}`);
  }
}

window.ToolNexusModules = window.ToolNexusModules || {};
window.ToolNexusModules['xml-to-json'] = { runTool };
