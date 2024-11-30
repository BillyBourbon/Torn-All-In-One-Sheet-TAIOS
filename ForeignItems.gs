
function runForeignStocks(){
  let tornItems = tornApiCall({section:"torn",selections:["items"],apiKey:apiKey,}).items
  
  let countries = getForeignStockYata().stocks
  
  let outputItems = []
  
  Object.entries(countries).forEach(([countryCode, country])=>{
    let { update, stocks } = country
    let { countryName, flightTime } = countriesData[countryCode]
    let countryOutput = []

    let updateTime = Utilities.formatDate(new Date(update*1000), "UTC", "HH:mm:ss - dd/MM/yy")
    
    stocks.forEach(item=>{
      let { id, name, quantity, cost } = item
      let { type, market_value } = tornItems[id]
      let profit = market_value - cost
      let ppm = profit / flightTime
      let row = [countryName, flightTime,id, name, type, quantity, cost, market_value, profit, ppm, updateTime]
      
      countryOutput.push(row)
    })
    
    outputItems = outputItems.concat(countryOutput)
  })
  
  let sheet = ss.getSheetByName("Foreign Item Stock")
  
  if(sheet != null){
    sheet.getRange(3,2,sheet.getLastRow()-3, sheet.getLastColumn()-2).clearContent().clearFormat()
    sheet.getRange(3,2,outputItems.length,outputItems[0].length).setValues(outputItems)
  } else{
    sheet = ss.insertSheet("Foreign Item Stock")
    
    let headers = [ [ "Country","Flight Time (Mins)", "Item ID", "Item Name", "Item Type", "Quantity", "Cost", "Market Value", "Profit Per 1","Profit Per Minute", "Last Update Time" ] ]
    
    sheet.getRange(2,2,1,headers[0].length).setValues(headers)
    sheet.getRange(3,2,outputItems.length,outputItems[0].length).setValues(outputItems)
  }
  formatTravelSheet(sheet)
}

function formatTravelSheet(sheet = ss.getSheetByName("Foreign Item Stock")){
  if(sheet == null || sheet == undefined) return console.log("NO Sheet")

  sheet.clearFormats()
  sheet.clearConditionalFormatRules()
  if(sheet.getFilter())sheet.getFilter().remove()

  sheet.getRange(2,2,sheet.getLastRow()-1,sheet.getLastColumn()-1).setBorder(true,true,true,true,null,true,"black",SpreadsheetApp.BorderStyle.DOUBLE)
  sheet.getRange(3,2,sheet.getLastRow()-2,sheet.getLastColumn()-1).setBorder(null,null,null,null,true,true,"black",SpreadsheetApp.BorderStyle.DASHED)
  
  sheet.getDataRange().setVerticalAlignment("middle").setHorizontalAlignment("center").setWrap(true)
 
  let green = SpreadsheetApp.newColor().setRgbColor("#14dc39").build()
  let red = SpreadsheetApp.newColor().setRgbColor("ff5733").build()
  
  const rule = SpreadsheetApp.newConditionalFormatRule()
  .setGradientMaxpointObjectWithValue(green,SpreadsheetApp.InterpolationType.NUMBER,`1`)
  .setGradientMidpointObjectWithValue(red,SpreadsheetApp.InterpolationType.NUMBER,`-1`)
  .setGradientMinpointObjectWithValue(red, SpreadsheetApp.InterpolationType.MIN,`-999999999999999`)
  .setRanges([sheet.getRange(3,10,sheet.getLastRow()-2,2)])
  .build()
  
  const rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);

  sheet.getRange(2,2,sheet.getLastRow()-1,sheet.getLastColumn()-1).createFilter().sort(10,false)

  let numberFormat =  ["","0",'#,##0;(#,##0)',"","",'#,##0;(#,##0)','"$"#,##0','"$"#,##0','"$"#,##0','"$"#,##0',""]
  let numberFormats = new Array(sheet.getLastRow()-2).fill(numberFormat)
  sheet.getRange(3,2,sheet.getLastRow()-2,sheet.getLastColumn()-1).setNumberFormats(numberFormats)
  sheet.setColumnWidth(1,10)
  sheet.setRowHeight(1,10)
  sheet.setColumnWidths(2,sheet.getLastColumn()-1,125)
  sheet.setRowHeights(2,sheet.getLastRow()-1,30)
  if(sheet.getMaxColumns() != sheet.getLastColumn()+1){
    sheet.deleteColumns(sheet.getLastColumn()+1,sheet.getMaxColumns()-sheet.getLastColumn()-1)
  }
  if(sheet.getMaxRows() != sheet.getLastRow()+1){
    sheet.deleteRows(sheet.getLastRow()+1,sheet.getMaxRows()-sheet.getLastRow()-1)
  }
  sheet.setColumnWidth(sheet.getMaxColumns(),10)
  sheet.setRowHeight(sheet.getMaxRows(),10)
  
}

function getForeignStockYata(){
  let url = `https://yata.yt/api/v1/travel/export/`

  let call = UrlFetchApp.fetch(url)
  
  if(call.getResponseCode() != 200) {
    console.log(`Error: `, call)
    return { error: `Error making request to ${url}`}
  }
  
  let data = JSON.parse(call.getContentText())
  
  return data
}

// Make Request To TornAPI
function tornApiCall(options){
  let { section, id, selections, apiKey } = options
  
  if(!id) id = 0
  if(!section) throw Error(`No Section Provided`)
  if(!apiKey) throw Error(`No Apikey Provided`)

  let call = `https://api.torn.com/${section}/${id}?selections=${selections.join(`,`)}&key=${apiKey}`

  let response = UrlFetchApp.fetch(call)
  
  if(!response.getResponseCode() == 200) throw Error(`Bad Api Call, Section: ${section}, id: ${id}, Selections: ${selections}, ApiKey: ${apiKey}`)
  
  return JSON.parse(response.getContentText())
}

const countriesData = {
  "mex":{
    "countryName":"Mexico",
    "flightTime":18,
  },
  "cay":{
    "countryName":"Cayman Islands",
    "flightTime":25,
  },
  "can":{
    "countryName":"Canada",
    "flightTime":29,
  },
  "haw":{
    "countryName":"Hawai",
    "flightTime":94,
  },
  "uni":{
    "countryName":"United Kingdom",
    "flightTime":111,
  },
  "arg":{
    "countryName":"Argentina",
    "flightTime":117,
  },
  "swi":{
    "countryName":"Switzerland",
    "flightTime":123,
  },
  "jap":{
    "countryName":"Japan",
    "flightTime":158,
  },
  "chi":{
    "countryName":"China",
    "flightTime":169,
  },
  "uae":{
    "countryName":"United Arab Emirates",
    "flightTime":190,
  },
  "sou":{
    "countryName":"South Africa",
    "flightTime":208,
  },
}





function setupTriggerToRunForeignItems(){
  let status = -1
  // 1 : trigger set
  // 0 : trigger already set
  // -1: trigger setup failed
  
  let propKey = "triggerIdRunForeignItems"
  let functionToRun = `runForeignStocks`
  let triggerId = PropertiesService.getScriptProperties().getProperty(propKey)
  
  if(triggerId) {
    status = 0
    return status
  }
  console.log(functionToRun)
  try{
    let trigger = ScriptApp.newTrigger(functionToRun).timeBased().everyMinutes(5).create()
    PropertiesService.getScriptProperties().setProperty(propKey,trigger.getUniqueId())
    this[functionToRun]()
    
    status = 1 
  } catch(e){
    console.log(e)
  }

  return status
}
function deleteTriggerToForeignItems(){
  let status = -1;
  // 1 : trigger deleted
  // 0 : trigger not present
  // -1: trigger not deleted
  
  let propKey = "triggerIdRunForeignItems"
  let triggerId = PropertiesService.getScriptProperties().getProperty(propKey)
  try{
    let triggers = ScriptApp.getProjectTriggers()
    triggers.forEach(trigger=>{
      if(trigger.getUniqueId().toString() != triggerId) return
      ScriptApp.deleteTrigger(trigger)
      PropertiesService.getScriptProperties().deleteProperty(propKey)
    })
    status = 1
  } catch(e){
    console.log(e)
    status = -1
  }
  console.log(status)
  return status
}
