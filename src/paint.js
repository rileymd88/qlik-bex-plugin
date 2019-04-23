var qlik = window.require('qlik');
import dialog from '../static/dialog.html';
import varHtml from '../static/variableModal.html';
import html from '../static/qdcBex.html';

var rendered = false;
var variableValueList = [];
var setupOn = false;
var dialogStatus = 0;
var qdcApp;
var bexConnection = '';
var reloadId = '';
var ranReloadAlready = false;


export default async function ($element, layout) {
    if (layout.hideElement) {
        $('#setupLogoContainer').hide();
    }
    else {
        $('#setupLogoContainer').show();
    }

    // Only run through here if page has not been rendered before
    if (!rendered) {
        rendered = true;
        // Get app references
        var app = await qlik.currApp(this);
        var global = await qlik.getGlobal(config);
        var enigma = await this.backendApi.model.enigmaModel.app;
        try {
            var version = await enigma.global.engineVersion();
            version = version.qComponentVersion.replace(/./g, '');
            // If less then or equal to Nov 2018
            if(parseInt(version) <= 122447) {
                $(".qui-buttonset-right").prepend($("<button class='lui-button lui-button--toolbar' id='buttonPlugin'><span class='lui-icon  lui-icon--database'></span><span class='lui-button__text'>BEx Plugin</span></button>"));
            }
            else {
                $(".qs-toolbar__right").prepend($("<button class='lui-button' id='buttonPlugin' style='margin-right:2px;'><span class='lui-icon  lui-icon--database'></span><span class='lui-button__text'></span></button>"));
            }
        }
        catch (err) {
            console.log(err);
        }
        // Get current user
        var currentUser = await getUserName(global);

        // Get script of currentApp
        var currentScript = await enigma.app.getScript();
        var scriptSetupCheck = currentScript.match(/SETUP HAS BEEN FINISHED/g);



        function setupLogo() {
            $('#setupContainer').remove();
            $element.append('<div id="setupLogoContainer" class="setupContainer"></div>');
            $('#setupLogoContainer').append('<div id ="logoContainer" class="imageContainer"></div>');
            $('#logoContainer').append('<img id="setupLogo" class ="setupLogo"src="../extensions/qlik-bex-plugin/static/img/logo.png" height="100%" width="100%"></img>');
            if (layout.hideElement) {
                $('#setupLogoContainer').hide();
            }
        }

        function setupButton() {
            $element.append('<div id="setupContainer" class="setupContainer"></div>');
            $('#setupContainer').append('<button id="startSetup" class="lui-button  lui-dialog__button">Setup</button>');
            $('#startSetup').on('click', function () {
                dialogStatus = 0;
                $('#buttonPlugin').click();
            })
        }

        // If no setup completed, show button and logo 
        if (!scriptSetupCheck) {
            setupButton();
            setupButtonPlugin();
        }
        else {
            setupLogo();
            setupButtonPlugin();
            // Listener for new selections
        }

        var bexConnectionSplit = currentScript.split('SAPBEXCONN');
        if (bexConnectionSplit[1]) {
            bexConnection = bexConnectionSplit[1];
        }

        setupCheck = await checkForSetup();
        async function checkForSetup() {
            return new Promise(async function (resolve, reject) {
                var currentScript = await enigma.app.getScript();
                var metaApp = currentScript.split('SAPMETAAPP');
                if (metaApp[1]) {
                    metaApp = metaApp[1];
                    qdcApp = await qlik.openApp(metaApp, config);
                    resolve(true)
                }
                else {
                    resolve(false)
                }
            })
        }

        async function checkForSapScript() {
            return new Promise(async function (resolve, reject) {
                var currentScript = await enigma.app.getScript();
                var sapScriptCheck = currentScript.match(/SAPSCRIPTSPLITTER/g);
                if (sapScriptCheck) {
                    resolve(true)
                }
                else {
                    resolve(false)
                }
            })
        }


        // Function to get value expression
        function getValueExpression(valueExpression) {
            return new Promise(function (resolve, reject) {
                qdcApp.createGenericObject({
                    valueExpression: {
                        qValueExpression: valueExpression
                    }
                }, function (reply) {
                    resolve(reply.valueExpression);
                });
            });
        }





        // Listener for open Dialog

        function setupButtonPlugin() {
            $("#buttonPlugin").on('click', async function () {
                if ($("#buttonPlugin").attr("setup")) {
                    var setupData = JSON.parse($("#buttonPlugin").attr("setup"));
                    setupOn = setupData.setupOn;
                    dialogStatus = setupData.dialogStatus;
                    $("#buttonPlugin").attr("setup", "");
                }

                scriptSetupCheck = await checkForSetup();
                var scriptSapCheck = await checkForSapScript();
                if (!scriptSetupCheck || setupOn == true) {
                    dialogStatus = 0;
                    $("body").append(dialog);
                    await createConnectionInterface();
                }
                else {
                    // Start with Variable if the setting is variable
                    await setDimAndMeasureSelection();
                    var goToVariableSelections = await getValueExpression('=If(GetSelectedCount(QUERY_DESC_NAME) = 1 and GetSelectedCount(DIM_CAP_NAM) > 0 and GetSelectedCount(MES_CAP_NAM) > 0, 1, 0)')
                    if (layout.bexStartingPoint == 2 && scriptSapCheck == true && goToVariableSelections == 1) {
                        dialogStatus = 2;
                        $("body").append(dialog);
                        $("#setupHeader").hide();
                        $('#setupContent').hide();
                        $("#step1Header").hide();
                        $('#step1Content').hide();
                        await getVariablesFromScript();
                        await createVariableTable();
                        $("#setupHeader").hide();
                        $('#setupContent').hide();
                        $("#step1Header").hide();
                        $('#step1Content').hide();
                        $('#resetSelections').hide();
                        $('#clearSelections').hide();
                        $("#step2Header").show();
                        $('#step2Content').show();
                        $('#backButton').show();
                    }

                    // Start with Query
                    if (layout.bexStartingPoint == 1 || scriptSapCheck == false || goToVariableSelections == 0) {
                        dialogStatus = 1;
                        $("body").append(dialog);
                        $("#setupHeader").hide();
                        $('#setupContent').hide();
                        $("#step1Header").show();
                        $('#step1Content').show();
                        $('#resetSelections').show();
                        $('#clearSelections').show();
                        await getFilters();
                        await populateBookmarks();
                    }
                }

                // Listener for backk button
                $("#backButton").on('click', async function () {
                    dialogStatus = 1;
                    await populateBookmarks();
                    variableValueList = await getQueryVariables();
                    $("#step2Header").hide();
                    $("#step2Content").hide();
                    //$("#validateVariables").hide();
                    $("#step1Header").show();
                    $("#step1Content").show();
                    $("#clearSelections").show();
                    $("#resetSelections").show();
                    $("#selectBookmark").show();
                    $('#resetSelections').show();
                    $('#clearSelections').show();
                    $('#qdcTableContent').empty();
                    $("#qbpBookmarkLabel").hide();
                    $("#qbpBookmarkName").hide();
                    $(this).hide();
                    getFilters();

                })

                $("#backButtonVar").on('click', async function () {
                    $("#dialogCancel").show();
                    $("#goToInsights").hide();
                    $("#goToSheet").hide();
                    $(".dialogReload").hide();
                    $("#cancelledReloadMsg").remove();
                    $("#dialogClose").hide();
                    $("#backButtonVar").hide();
                    $("#step3Header").hide();
                    $("#dialogNext").show();
                    $("#backButton").show();
                    $("#step2Header").show();
                    $("#step2Content").show();
                    $("#qbpBookmarkLabel").show();
                    $("#qbpBookmarkName").show();
                    $("#reloadStatus").empty();
                    $("#reloadSuccess").hide();
                    $("#reloadFailure").hide();
                    //$("#validateVariables").show();
                    dialogStatus = 2
                })

                $("#dialogClose").on('click', async function () {
                    $("#pluginDialogBackground").remove();
                    $("#pluginDialog").remove();
                    $("#reloadStatus").empty();
                })

                $("#goToInsights").on('click', async function () {
                    var url = window.location.href;
                    var urlList = url.split("/");
                    var sheetId = urlList[7];
                    window.location = 'https://' + config.host + "/sense/app/" + app.id + "/sheet/" + sheetId + "/state/insight";
                })



                // Listener to close Dialog
                $("#dialogCancel").on('click', function () {
                    $("#pluginDialog").remove();
                    $("#pluginDialogBackground").remove();
                });

                // Listener for clear selections button
                $("#clearSelections").click(function () {
                    qdcApp.clearAll();
                    $('#selectBookmark').val("Default");
                    $("#selectVariables").hide();
                    $("#createApp").hide();
                })

                // Listener for reset selections button
                $("#resetSelections").click(async function () {
                    await qdcApp.clearAll();
                    await getVariablesFromScript();
                    await setDimAndMeasureSelection();
                })

                // Listener for bookmark selection
                $("#selectBookmark").change(async function () {
                    var bookmarkId = $(this).val();
                    if (bookmarkId == "Default") {
                        qdcApp.clearAll();
                    }
                    else {
                        qdcApp.bookmark.apply(bookmarkId);
                    }
                    var bookmarksList = await getBookmarks();

                    for (var i = 0; i < bookmarksList.length; i++) {
                        if (bookmarksList[i].qInfo.qId == bookmarkId) {
                            variableValueList = JSON.parse(bookmarksList[i].qData.description);
                        }
                    }
                })

                // Create filter panes based on config.js
                function getFilters() {
                    if ($('#filterHolder0').is(':empty')) {

                        qdcApp.visualization.get(qdcConfig.measures).then(function (vis) {
                            vis.show("filterHolder2");
                        });
                        qdcApp.visualization.get(qdcConfig.dimensions).then(function (vis) {
                            vis.show("filterHolder1");
                        });
                        qdcApp.visualization.get(qdcConfig.bexQueryDesc).then(function (vis) {
                            vis.show("filterHolder0");
                            //Asks if Browser is IE
                            var isIE = false || !!document.documentMode;
                            waitForElementToDisplay(".qv-collapsed-listbox.ng-scope.ng-isolate-scope.spark.interactive", 50);
                        });
                    }

                    // Function that waits for Listbox-containers - IE11 display bug
                    function waitForElementToDisplay(selector, time) {
                        if (document.querySelector(selector) != null) {
                            $(".qv-collapsed-listbox.ng-scope.ng-isolate-scope.spark.interactive").removeClass('spark');
                            return;
                        }
                        else {
                            setTimeout(function () {
                                waitForElementToDisplay(selector, time);
                            }, time);
                        }
                    }

                    // deletes Class spark if a selection has been made - IE11 display bug
                    qdcApp.getList("SelectionObject", function () {
                        var isIE = false || !!document.documentMode;
                        waitForElementToDisplay(".qv-collapsed-listbox.ng-scope.ng-isolate-scope.spark.interactive", 50);
                    });
                };


                // Function to get sense variables from meta app
                // A hypercube needs to be created due to the fact that the Variable API acts strange https://community.qlik.com/thread/287064
                function getSenseVariables(variable) {
                    return new Promise(function (resolve, reject) {
                        qdcApp.createCube({
                            "qDimensions": [{
                                "qDef": {
                                    "qFieldDefs": ["Dummy"]
                                }
                            }],
                            "qMeasures": [{
                                "qDef": {
                                    "qDef": variable,
                                    "qLabel": "Variable"
                                }
                            }],
                            "qInitialDataFetch": [{
                                qHeight: 1,
                                qWidth: 2
                            }]

                        }, function (reply) {
                            resolve(reply.qHyperCube.qDataPages["0"].qMatrix["0"]["0"].qText);
                        });
                    })
                }

                // Function to create variable table
                async function createVariableTable() {
                    // Create table with variable options
                    var availableVariables = await getStringExpression("=concat(VAR_NAM_FINAL, ',')");
                    var listOfVariables = availableVariables.split(",");
                    if (listOfVariables[0].length > 0) {
                        $('#noVariableMessage').hide();
                        $('#qdcTable').show();
                        for (var i = 0; i < listOfVariables.length; i++) {
                            await createVariableOptions(listOfVariables[i], i);
                        }
                        variableValueList = [];
                        $(".qdcTd").on('click', ".lui-icon.lui-icon--large.lui-icon--search", async function () {
                            var techVarName = $(this).attr("value");
                            var id = $(this).parent().attr('id').replace('varTd', '');
                            var opType = $(`#qdcInput${id}`).val();
                            var index = $(this).index();
                            var lowHigh = 'NONE';
                            if (opType == 'BT' && index == 1) {
                                lowHigh = 'LOW';
                            }
                            if (opType == 'BT' && index == 3) {
                                lowHigh = 'HIGH';
                            }
                            try {
                                var filterPane = await createVariableFilters(techVarName);
                                createVariableDialog(filterPane, techVarName, lowHigh);
                            }

                            catch (err) {
                            }
                        })
                    }
                    else {
                        $('#noVariableMessage').show();
                        $('#qdcTable').hide();
                        variableValueList = '';
                    }
                }

                async function createVariableOptions(techVarName, i) {
                    var friendlyVarNameProm = getStringExpression(`=Concat({1<VAR_NAM_FINAL={"${techVarName}"}>}distinct DESCRIPTION_VARIABLE)`);
                    var varTypeProm = getValueExpression(`=Concat({1<VAR_NAM_FINAL={"${techVarName}"}>}distinct VAR_SELC_TYPE)`);
                    var varMandatoryProm = getValueExpression(`=Concat({1<VAR_NAM_FINAL={"${techVarName}"}>}distinct VAR_ENTRY_TYPE)`);
                    var defaultLowProm = getStringExpression(`=Concat({1<VAR_NAM_FINAL={"${techVarName}"}>}distinct DEFAULT_LOW)`);
                    var defaultHighProm = getStringExpression(`=Concat({1<VAR_NAM_FINAL={"${techVarName}"}>}distinct DEFAULT_HIGH)`);
                    var friendlyVarName = await friendlyVarNameProm;
                    var varType = await varTypeProm;
                    var varMandatory = await varMandatoryProm;
                    var defaultLow = await defaultLowProm;
                    var defaultHigh = await defaultHighProm;
                    $('#qdcTable').append(`<tr id="qdcVariable${i}" class="qdcTr"><td id=qdcTd${i} class="qdcTd">${friendlyVarName}</td></tr>`);
                    $(`#qdcVariable${i}`).append(`<td id="qdcTd${i}"class="qdcTd"><select id="qdcInput${i}" class="operation lui-select"></td>`);
                    switch (varType) {
                        case 1:
                            $(`#qdcInput${i}`).empty();
                            $(`#qdcInput${i}`).append('<option value="EQ">=</option>');
                            $(`#qdcInput${i}`).data('pre', 'EQ');
                            break;
                        case 2:
                            $(`#qdcInput${i}`).append('<option value="BT">Between</option>');
                            $(`#qdcInput${i}`).append('<option value="EQ">=</option>');
                            $(`#qdcInput${i}`).data('pre', 'BT');
                            break;
                        case 3:

                            $(`#qdcInput${i}`).empty();
                            $(`#qdcInput${i}`).append('<option value="EQ">=</option>');
                            $(`#qdcInput${i}`).append('<option value="GT">></option>');
                            $(`#qdcInput${i}`).append('<option value="LT"><</option>');
                            $(`#qdcInput${i}`).append('<option value="GE">>=</option>');
                            $(`#qdcInput${i}`).append('<option value="LE"><=</option>');
                            $(`#qdcInput${i}`).append('<option value="BT">Between</option>');
                            $(`#qdcInput${i}`).data('pre', 'EQ');
                            break;
                        case 4:
                            $(`#qdcInput${i}`).empty();
                            $(`#qdcInput${i}`).append('<option value="EQ">=</option>');
                            $(`#qdcInput${i}`).data('pre', 'EQ');
                            break;
                    }

                    switch (varMandatory) {
                        // Optional
                        case 0:
                            break;
                        // Mandatory without default value
                        case 1:
                            $(`#qdcTd${i}`).prepend('* ');
                            $(`#qdcTd${i}`).css("font-weight", "bold");
                            break;
                        // Mandatory with default value
                        case 2:
                            $(`#qdcTd${i}`).prepend('* ');
                            $(`#qdcTd${i}`).css("font-weight", "bold");
                            break;
                    }

                    $(`#qdcVariable${i}`).append(`<td id="varTd${i}"class="qdcTd"><input id="varInput${techVarName}" class="lui-input variable" placeholder="VALUE" value="${defaultLow}"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span></td>`);
                    if (varType == 2) {
                        $(`#varTd${i}`).empty();
                        $(`#varTd${i}`).append(`<input id="varInput${techVarName}" class="lui-input variableLow" value="${defaultLow}" placeholder="LOW"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                        $(`#varTd${i}`).append(`<input id="varInput${techVarName}" class="lui-input variableHigh" value="${defaultHigh}" placeholder="HIGH"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                    }

                    // Listener for selection of an operation type
                    $(`#qdcInput${i}`).change(async function () {
                        var id = $(this).attr('id');
                        var rowNo = id.replace('qdcInput', '');
                        var previousOpType = $(`#${id}`).data('pre');
                        if ($(this).val() == 'BT') {
                            $(`#varTd${rowNo}`).empty();
                            $(`#varTd${rowNo}`).append(`<input id="varInput${techVarName}" class="lui-input variableLow" placeholder="LOW"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                            $(`#varTd${rowNo}`).append(`<input id="varInput${techVarName}" class="lui-input variableHigh" placeholder="HIGH"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                        }

                        if (previousOpType == 'BT') {
                            $(`#varTd${rowNo}`).empty();
                            $(`#varTd${rowNo}`).append(`<input id="varInput${techVarName}" class="lui-input variable" placeholder="VALUE"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                        }
                        $(`#${id}`).data('pre', $(this).val());
                    })

                    // Update UI Based on Variables Part 1 
                    for (var i = 0; i < variableValueList.length; i++) {
                        if (variableValueList[i].variable == techVarName) {
                            var parentId = $(`#varInput${variableValueList[i].variable}`).parent().attr('id');
                            var id = parentId.replace('varTd', '');
                            if (variableValueList[i].variableMode == 'BT') {
                                $(`#varTd${id}`).empty();
                                $(`#varTd${id}`).append(`<input id="varInput${techVarName}" class="lui-input variableLow" placeholder="LOW"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                                $(`#varTd${id}`).append(`<input id="varInput${techVarName}" class="lui-input variableHigh" placeholder="HIGH"/><span id=searchButton${i} value="${techVarName}" class="lui-icon lui-icon--large lui-icon--search" aria-hidden="true"></span>`);
                            }
                            $(`#qdcInput${id}`).val(variableValueList[i].variableMode);
                            $(`#qdcInput${id}`).data('pre', variableValueList[i].variableMode);
                        }
                    }
                    // Update UI Based on Variables Part 2
                    for (var i = 0; i < variableValueList.length; i++) {
                        if (variableValueList[i].variable == techVarName) {
                            var variablesForInput = JSON.stringify(variableValueList[i].variableValue);
                            variablesForInput = variablesForInput.replace(/,/g, ";").replace(/"/g, "").replace(/[\[\]']+/g, '');
                            if (variableValueList[i].variableHighLow == 'LOW') {
                                $(`#varInput${techVarName}.lui-input.variableLow`).val(variablesForInput);
                            }
                            else if (variableValueList[i].variableHighLow == 'HIGH') {
                                $(`#varInput${techVarName}.lui-input.variableHigh`).val(variablesForInput);
                            }
                            else {
                                $(`#varInput${variableValueList[i].variable}`).val(variablesForInput);
                            }
                        }
                    }
                    return;
                }

                // Listener for validate variables button
                $("#validateVariables").click(async function () {
                    // Get all input boxes and pass value to function which checks variable values
                    $('input[class^="lui-input variable"]').each(async function (index) {
                        await populateVariableValidations($(this), index);
                    })
                })

                async function populateVariableValidations(element, index) {
                    return new Promise(async function (resolve, reject) {
                        // Prepare List
                        id = element.attr('id');
                        techVarName = id.replace('varInput', '');
                        variablesList = element.val().split(";");
                        finalVariablesList = [];
                        for (var i = 0; i < variablesList.length; i++) {
                            finalVariablesList.push(variablesList[i].trim());
                        }

                        // Validate list
                        result = await validateVariables(techVarName, finalVariablesList);

                        // Change list to add underlines
                        for (var i = 0; i < result.length; i++) {
                            if (result[i].length > 0) {
                                for (v = 0; v < finalVariablesList.length; v++) {
                                    if (result[i] == finalVariablesList[v]) {
                                        finalVariablesList[v] = `<span style="text-decoration: underline">${finalVariablesList[v]}</span>`;
                                    }
                                }
                            }
                        }
                        // Update UI with new list
                        stringList = JSON.stringify(finalVariablesList).replace(/"/g, '').replace(/;+/g, ',').replace('[', '').replace(']', '');
                        element.val(stringList);
                        resolve(true);
                    })
                }

                // Function to get variables from UI
                async function getQueryVariables() {
                    variableValueList = [];
                    return new Promise(function (resolve, reject) {
                        var variableValues = '';
                        $('input[class^="lui-input variable"]').each(function () {
                            var parentElement = $(this).parent().parent().attr('id');
                            var parentId = parentElement.replace(/\D/g, '');
                            if ($(this).val()) {
                                var variableValues = $(this).val().split(";");
                            }
                            var variableValuesArray = [];
                            var variableHighLow = 'NONE';
                            if ($(this).attr('class') == 'lui-input variableHigh') {
                                variableHighLow = 'HIGH';
                            }
                            if ($(this).attr('class') == 'lui-input variableLow') {
                                variableHighLow = 'LOW';
                            }
                            if (variableValues) {
                                for (var i = 0; i < variableValues.length; i++) {
                                    variableValuesArray.push(variableValues[i]);
                                }

                                variableValueList.push(
                                    {
                                        variable: $(this).attr('id').replace("varInput", ""),
                                        variableValue: variableValuesArray,
                                        variableMode: $(`#${parentElement}`).find(`#qdcInput${parentId}`).val(),
                                        variableHighLow: variableHighLow
                                    }
                                )
                            }
                        });
                        resolve(variableValueList);
                    })
                }

                // Function to create variable filter box
                function createVariableFilters(techVarName) {
                    return new Promise(function (resolve, reject) {
                        qdcApp.visualization.create(
                            'listbox',
                            [`=If(VAR_NAM_FINAL = '${techVarName}', MEM_CAP & ' | ' & MEM_NAM, null())`],
                            {}
                        ).then(function (vis) {
                            resolve(vis);
                        });
                    })
                }

                // Function to create pop up variable dialog with filterpane
                async function createVariableDialog(filterPane, techVarName, lowHigh) {
                    await qdcApp.field('VAR_NAM_FINAL').clear();
                    $("body").append(varHtml);
                    filterPane.show($("#qdcVariableDialogContent"));
                    $("#cancelVariableDialog").click(async function () {
                        $("#qdcVariableModal").remove();
                        $("#qdcVariableDialog").remove();
                        try {
                            await qdcApp.field('MEM_CAP').clear();
                            await qdcApp.field('MEM_NAM').clear();
                            await qdcApp.field('VAR_NAM_FINAL').clear();
                            destroyObject(filterPane.id);
                        }
                        catch (err) {
                        }
                    })
                    $("#saveVariableDialog").click(async function () {
                        $("#qdcVariableModal").remove();
                        $("#qdcVariableDialog").remove();
                        try {
                            var selections = await getStringExpression(`=Concat({<VAR_NAM_FINAL={'${techVarName}'}>}distinct "MEM_NAM", ';', 1000)`);
                        }
                        catch (err) {
                        }
                        var selector = `#varInput${techVarName}`;
                        if (lowHigh == 'LOW') {
                            selector = `#varInput${techVarName}.lui-input.variableLow`;
                        }
                        if (lowHigh == 'HIGH') {
                            selector = `#varInput${techVarName}.lui-input.variableHigh`;
                        }
                        $(`${selector}`).val(selections);
                        try {
                            await qdcApp.field('MEM_CAP').clear();
                            await qdcApp.field('MEM_NAM').clear();
                            await qdcApp.field('VAR_NAM_FINAL').clear();
                            destroyObject(filterPane.id);
                        }
                        catch (err) {
                        }

                    })
                }

                async function validateVariables(techVarName, inputVariablesList) {
                    return new Promise(async function (resolve, reject) {
                        // Get possible variables and convert it to a list
                        var variables = await getStringExpression(`=Concat({1<VAR_NAM_FINAL={${techVarName}}>}distinct MEM_NAM, ',')`);
                        var variablesList = variables.split(",");
                        var possibleVariablesList = [];
                        for (var i = 0; i < variablesList.length; i++) {
                            possibleVariablesList.push(variablesList[i].trim());
                        }

                        // Loop through all variables and check to see if they exist in the possible variables list
                        incorrectVariables = [];
                        if (inputVariablesList[0].length > 0) {
                            for (var i = 0; i < inputVariablesList.length; i++) {
                                validVariable = false;
                                for (v = 0; v < possibleVariablesList.length; v++) {
                                    if (String(inputVariablesList[i]) == String(possibleVariablesList[v])) {
                                        validVariable = true;
                                    }
                                    if (v == possibleVariablesList.length - 1) {
                                        if (!validVariable) {
                                            incorrectVariables.push(inputVariablesList[i]);
                                        }
                                    }
                                }
                            }
                        }
                        resolve(incorrectVariables);
                    })
                }

                // Function to destroy session objects
                async function destroyObject(id) {
                    try {
                        await enigma.app.destroySessionObject(id);
                    }
                    catch (err) {
                    }
                }

                // function to create bookmarks button
                async function createBookmark(bookmarkName) {
                    try {
                        var variableValueList = await getQueryVariables();
                        await qdcApp.bookmark.create(bookmarkName, JSON.stringify(variableValueList), qdcConfig.bookmarkSheetId);
                    }
                    catch (err) {
                    }
                }

                // Function to get string expressions
                function getStringExpression(stringExpression) {
                    return new Promise(function (resolve, reject) {
                        qdcApp.createGenericObject({
                            stringExpression: {
                                qStringExpression: stringExpression
                            }
                        }, function (reply) {
                            resolve(reply.stringExpression);
                        });
                    });
                }

                // Function to get variables from load script
                async function getVariablesFromScript() {
                    var variableListFromScript = currentScript.split('"VARIABLELIST"');
                    if (variableListFromScript[1]) {
                        variableValueList = JSON.parse(variableListFromScript[1]);
                    }
                }

                // Function to get list of fields within app and make selections
                async function setDimAndMeasureSelection() {
                    // Get list of fields
                    var reply = await app.getList("FieldList");
                    var dimensionsList = [];
                    var measuresList = [];

                    // Get query name in order to make selection
                    var queryNameList = [];
                    var currentScript = await enigma.app.getScript();
                    var queryNameFromScript = currentScript.split("QUERYNAME");

                    if (queryNameFromScript[1]) {
                        var queryName = await getStringExpression(`=Concat({<QUERY_NAME={'${queryNameFromScript[1]}'}>}distinct QUERY_DESC_NAME)`);
                        queryNameList.push(queryName);
                    }

                    // Determine which fields are dimensions or measures
                    var arrayLength = reply.layout.qFieldList.qItems.length;
                    for (var i = 0; i < arrayLength; i++) {
                        var tagArray = await reply.layout.qFieldList.qItems[i].qTags.length;
                        for (var t = 0; t < tagArray; t++) {
                            if (reply.layout.qFieldList.qItems[i].qTags[t] == "$dimension") {
                                dimensionsList.push(reply.layout.qFieldList.qItems[i].qName);
                            }
                            if (reply.layout.qFieldList.qItems[i].qTags[t] == "$measure") {
                                measuresList.push(reply.layout.qFieldList.qItems[i].qName);
                            }
                        }
                    }
                    var finalDimList = [];
                    var finalMesList = [];
                    for (var d = 0; d < dimensionsList.length; d++) {
                        var dim1 = await getStringExpression(`=Concat({<DIM_CAP={'${dimensionsList[d]}'},QUERY_NAME={'${queryNameFromScript[1]}'} >}distinct DIM_CAP_NAM)`);
                        finalDimList.push(dim1);
                    }
                    for (var m = 0; m < measuresList.length; m++) {
                        var mes1 = await getStringExpression(`=Concat({<MES_CAP={'${measuresList[m]}'},QUERY_NAME={'${queryNameFromScript[1]}'}>}distinct MES_CAP_NAM)`);
                        finalMesList.push(mes1);
                    }

                    // Make selections
                    if (dimensionsList.length >= 1 || measuresList.length >= 1 || queryNameList.length >= 2) {
                        try {
                            await qdcApp.field("QUERY_DESC_NAME").selectValues(queryNameList, false, true);
                            await qdcApp.field("DIM_CAP_NAM").selectValues(finalDimList, false, true);
                            await qdcApp.field("MES_CAP_NAM").selectValues(finalMesList, false, true);
                        }
                        catch (err) {
                        }
                    }
                }

                // Listener for create app simple
                async function startExec() {
                    variableValueList = await getQueryVariables();
                    createFinalApp();
                }

                async function removeDimsAndMeasures() {
                    return new Promise(async function (resolve, reject) {
                        // Get list of fields
                        var layoutItems = await enigma.app.getAllInfos();
                        var dimensionsList = await qlik.callRepository("/qrs/app/object/full?filter=app.id eq " + app.id + " and description eq 'BExPlugin' and objectType eq 'dimension'");
                        var measuresList = await qlik.callRepository("/qrs/app/object/full?filter=app.id eq " + app.id + " and description eq 'BExPlugin' and objectType eq 'measure'")
                        // Destroy
                        for (var i = 0; i < measuresList.data.length; i++) {
                            enigma.app.destroyMeasure(measuresList.data[i].engineObjectId);
                        }

                        for (var i = 0; i < dimensionsList.data.length; i++) {
                            enigma.app.destroyDimension(dimensionsList.data[i].engineObjectId);
                        }
                        resolve();
                    })
                }

                async function createDimension(dimension) {
                    enigma.app.createDimension({
                        qInfo: {
                            qId: '',
                            qType: 'dimension'
                        },
                        qDim: {
                            qGrouping: 'N',
                            qFieldDefs: [dimension],
                            qFieldLabels: [dimension],
                            title: dimension
                        },
                        qMetaDef: {
                            title: dimension,
                            description: 'BExPlugin'
                        }
                    });
                }

                async function createMeasure(measureName) {
                    enigma.app.createMeasure({
                        qInfo: {
                            qId: '',
                            qType: 'measure'
                        },
                        qMeasure: {
                            qLabel: measureName,
                            qDef: `=Sum([${measureName}])`
                        },
                        qMetaDef: {
                            title: 'Total ' + measureName,
                            description: 'BExPlugin'
                        }
                    })
                }

                async function createVariables(name, definition) {
                    return new Promise(async function (resolve, reject) {
                        try {
                            await app.variable.getByName(name);
                            await app.variable.setStringValue(name, String(definition));
                            resolve();
                        }
                        catch (err) {
                            await app.variable.create({ qName: name, qDefinition: String(definition) });
                            resolve(err);
                        }
                    })
                }

                async function createFinalApp(newApp, newAppName) {
                    if ($("#backButton").is(":visible")) {
                        await getQueryVariables();
                    }
                    // create script with local settings from config
                    var script = '';
                    script += localsettings;
                    script += "///$tab Qlik BEx Plugin Config\r\n";
                    // Get needed data
                    var queryName = await getStringExpression("=QUERY_NAME");
                    var loadStatementTemp = await getSenseVariables('$(SenseVLoad)');

                    if (layout.currencyUnit == false) {
                        //Remove UNIT & CURRENCY from Loadstatement
                        var loadStatementTransform = loadStatementTemp.split(',');
                        var search_term = '[CURRENCY';
                        var search_term2 = '[UNIT';

                        for (var i = loadStatementTransform.length - 1; i >= 0; i--) {
                            if (loadStatementTransform[i].slice(1, 10) == search_term) {
                                loadStatementTransform.splice(i, 1);
                            } else {
                                if (loadStatementTransform[i].slice(1, 6) == search_term2) {
                                    loadStatementTransform.splice(i, 1);
                                }
                            }
                        }

                        var loadStatement = loadStatementTransform.join();
                    } else {
                        var loadStatement = loadStatementTemp;
                    }
                    var dimensions = await getSenseVariables('$(SenseVDimensions)');
                    var measures = await getSenseVariables('$(SenseVMeasures)');
                    var units = await getSenseVariables('$(SenseVUnit)');
                    var infoProvider = await getStringExpression("=QUERY_CAT");
                    // Start building script
                    script += '\n//SETUP HAS BEEN FINISHED \r\n';
                    var currentScript = await enigma.app.getScript();
                    var setupScript = currentScript.split('//SETUPSPLITTER');
                    if (setupScript[1]) {
                        script += `\n//SETUPSPLITTER${setupScript[1]}`;
                    }
                    script += '//SETUPSPLITTER\n';
                    script += '\n//QUERYVARIABLESSPLITTER';
                    script += `\n/* "VARIABLELIST"${JSON.stringify(variableValueList)}"VARIABLELIST"*/\n`;
                    script += `\n/* QUERYNAME${queryName}QUERYNAME*/`;
                    script += '\n//QUERYVARIABLESSPLITTER';
                    script += "///$tab SAP\r\n";
                    script += '\n//SAPSCRIPTSPLITTER\r\n';
                    var bexConnectionSplit = currentScript.split('SAPBEXCONN');
                    if (bexConnectionSplit[1]) {
                        bexConnection = bexConnectionSplit[1];
                    }
                    script += `\n LIB CONNECT TO '${bexConnection}'; \n\n`;
                    var variableArrays = ''
                    var variablesScript = '';
                    var forEach = '';
                    var nextScript = '';
                    // Create variables
                    for (var i = 0; i < variableValueList.length; i++) {
                        if (variableValueList[i].variableValue.length > 0 && variableValueList[i].variableValue[0].length > 0) {
                            if (String(variableValueList[i].variableHighLow) !== 'HIGH' && String(variableValueList[i].variableHighLow) !== 'LOW') {
                                var variableValues = JSON.stringify(variableValueList[i].variableValue);
                                var variableValues = variableValues.replace(/"/g, "'");
                                variableArrays += `SET vVariables${i} = ${variableValues};\n`;
                                forEach += `FOR EACH var${i} in $(vVariables${i})\n`
                                variablesScript += `[NAME=${variableValueList[i].variable}, SIGN=I, OPTION=${variableValueList[i].variableMode}, LOW=$(var${i})],\n`;
                                var nextlength = variableValueList.length - i - 1;
                                nextScript += `NEXT var${nextlength};\r\n`;
                            }
                        }
                        if (variableValueList[i].variableHighLow == 'LOW') {
                            var nextVariableId = i + 1;
                            if (variableValueList[nextVariableId].variableHighLow == 'HIGH') {
                                var lowVar = variableValueList[i].variableValue[0];
                                var highVar = variableValueList[nextVariableId].variableValue[0];
                                variablesScript += `[NAME=${variableValueList[i].variable}, SIGN=I, OPTION=${variableValueList[i].variableMode}, LOW=${lowVar}, HIGH=${highVar}],\n`;
                            }
                        }
                    }
                    script += variableArrays + forEach
                    script += '\n[' + queryName + ']:\r\n';
                    script += 'LOAD\n';
                    script += loadStatement;
                    script += '\r\n\n';
                    script += 'SELECT [' + queryName + ']\nDIMENSIONS (\n\r';
                    script += dimensions;
                    script += '\n\n)\MEASURES (\r\n';
                    script += measures;
                    script += '\n)\nUNITS (\n';

                    if (layout.currencyUnit == true) {
                        script += units;
                        script += '\n)\n';
                    }

                    // Adding Variables
                    script += '\n)\nVARIABLES (\n';
                    script += variablesScript
                    script += ')\n';
                    script += '\nFROM [' + infoProvider + '];\n\n'
                    script += nextScript;
                    // Remove dimensions and measures
                    if (layout.masterItems == true) {
                        await removeDimsAndMeasures();
                    }
                    // Add Tag to dimensions
                    var dimensions = dimensions.substring(0, dimensions.length - 1);
                    await enigma.app.createVariable
                    var dimensionsList = dimensions.split(",");
                    var varDimensions = [];
                    for (var i = 0; i < dimensionsList.length; i++) {
                        var dimensionTech = dimensionsList[i].trim().replace("[", "'").replace("]", "'");
                        var dimension = await getStringExpression(`=Concat({<DIM_NAM={${dimensionTech}}>}distinct DIM_CAP)`)
                        var dimensionText = `${dimension} Text`;
                        script += `tag field [${dimension}] with $dimension;\n`;
                        script += `tag field [${dimension} Text] with $dimension;\n`;
                        varDimensions.push(`[${dimension}]`);
                        if (layout.masterItems == true) {
                            createDimension(dimension);
                            createDimension(dimensionText);
                        }
                    }
                    await createVariables('vDimensionList', varDimensions.join(", "));
                    await createVariables('vDimensionCount', varDimensions.length);
                    // Add Tag to measures
                    var measures = measures.substring(0, measures.length - 1);
                    var measuresList = measures.split(",");
                    var varMeasures = [];
                    for (var i = 0; i < measuresList.length; i++) {
                        var measureTech = measuresList[i].trim().replace("[", "'").replace("]", "'");
                        var measure = await getStringExpression(`=Concat({<MES_NAM={${measureTech}}>}distinct MES_CAP)`)
                        script += `tag field [${measure}] with $measure;\n`;
                        varMeasures.push(`[${measure}]`);
                        if (layout.masterItems == true) {
                            createMeasure(measure);
                        }
                    }
                    await createVariables('vMeasuresList', varMeasures.join(", "));
                    await createVariables('vMeasuresCount', varMeasures.length);
                    script += '\n//SAPSCRIPTSPLITTER';
                    var endOfScript = currentScript.split('//ENDOFSAPSCRIPT');
                    if (endOfScript[1]) {
                        script += `\n//ENDOFSAPSCRIPT${endOfScript[1]}`;
                    }
                    else {
                        script += `\n//ENDOFSAPSCRIPT`;
                    }

                    // Set script using enigma app API
                    try {
                        await enigma.app.setScript(script);

                        // Funtions for Timer
                        var targetTimer = document.getElementsByTagName('timer')[0],
                            seconds = 0, minutes = 0, hours = 0,
                            t;

                        function add() {
                            seconds++;
                            if (seconds >= 60) {
                                seconds = 0;
                                minutes++;
                                if (minutes >= 60) {
                                    minutes = 0;
                                    hours++;
                                }
                            }
                            targetTimer.textContent = (hours ? (hours > 9 ? hours : "0" + hours) : "00") + ":" + (minutes ? (minutes > 9 ? minutes : "0" + minutes) : "00") + ":" + (seconds > 9 ? seconds : "0" + seconds);
                            timer();
                        }

                        function timer() {
                            t = setTimeout(add, 1000);
                        }

                        // Start Timer
                        timer();

                        //Function that waits for Listbox-containers - IE11 display bug
                        var vStopLoadDialog = false;

                        function waitForElementToDisplayLoadScreen(selector, time) {
                            if (document.querySelector(selector) != null) {
                                $('.lui-dialog-container').hide();
                                return;
                            }
                            else {
                                if (vStopLoadDialog != true) {
                                    setTimeout(function () {
                                        waitForElementToDisplayLoadScreen(selector, time);
                                    }, time);
                                }
                            }
                        }

                        // Watch for Reload Screen and hide it.
                        waitForElementToDisplayLoadScreen('.lui-dialog-container', 50)

                        // End Watch for Reload Screen after 10 seconds.
                        setTimeout(() => {
                            vStopLoadDialog = true;
                        }, 10000);
                        var reloadDone = false;
                        var intervalTimes = 0;
                        var ranReloadAlready = false;

                        // Reload Progress Information.
                        var progress = setInterval(function () {
                            if (reloadDone != true) {
                                enigma.global.getProgress(5).then(function (msg) {
                                    if (intervalTimes == 0 && ranReloadAlready == true) {
                                        intervalTimes = 1;
                                    }
                                    else {
                                        if (msg.qPersistentProgress) {
                                            var persistentProgress = msg.qPersistentProgress;
                                            var text = msg.qPersistentProgress;
                                            $("#reloadStatus").append(text + '\n');
                                            if (msg.qErrorData.length > 0) {
                                                $("#reloadStatus").append(msg.qErrorData[0].qErrorString + '\n');
                                            }
                                        } else if (msg.qErrorData.length > 0) {
                                            $("#reloadStatus").append(msg.qErrorData[0].qErrorString + '\n');
                                        } else {
                                            if (msg.qTransientProgress) {
                                                var text2 = persistentProgress + ' <-- ' + msg.qTransientProgress;
                                                $("#reloadStatus").append(text2 + '\n');
                                            }
                                        }
                                    }
                                })

                            } else {
                                clearInterval(progress)
                            }

                        }, 100);


                    } catch (err) {
                    }

                    // Reload app using enigma app API
                    try {

                        $("#cancelScript").click(async function () {
                            if (reloadDone == false) {
                                // Cancel reload
                                await enigma.app.global.cancelReload();
                                $("#qdcModal").remove();
                                $("#qdcLoadDialog").remove();
                                $("#cancelScript").hide();
                                $("#dialogClose").show();
                                $("#backButtonVar").show();
                                clearTimeout(t);
                                $("#qdcLoader").hide();
                                $(".dialogReload").hide();
                                $("#reloadStatus").empty();
                                reloadDone = true;
                                ranReloadAlready = true;
                            }
                        })
                        $("#goToSheet").click(function () {
                            $("#pluginDialogBackground").remove();
                            $("#pluginDialog").remove();
                            $("#reloadStatus").empty();
                        })

                        var reload = await enigma.app.doReload(0, 0, false);
                        enigma.global.getProgress(5).then(function (msg) {
                            if (msg.qPersistentProgress) {
                                var persistentProgress = msg.qPersistentProgress;
                                var text = msg.qPersistentProgress;
                                $("#reloadStatus").append(text + '\n');
                                if (msg.qErrorData.length > 0) {
                                    $("#reloadStatus").append(msg.qErrorData[0].qErrorString + '\n');
                                }
                            } else if (msg.qErrorData.length > 0) {
                                $("#reloadStatus").append(msg.qErrorData[0].qErrorString + '\n');
                            } else {
                                if (msg.qTransientProgress) {
                                    var text2 = persistentProgress + ' <-- ' + msg.qTransientProgress;
                                    $("#reloadStatus").append(text2 + '\n');
                                }
                            }
                            reloadDone = true;
                            ranReloadAlready = true;


                            // Stopping Timer
                            clearTimeout(t);
                            $("#qdcLoader").hide();
                            $("#backButtonVar").show();
                            if (reload != true) {
                                $("#reloadFailure").show();
                                $("#reloadStatus").append('<p style="color: red;">Error: Something went wrong!</p>');
                                $("#cancelScript").hide();
                                $("#dialogClose").show();
                            } else {
                                $("#reloadSuccess").show();
                                $("#reloadSuccess").css("display", "block");
                                $("#reloadStatus").append('<p style="color: green;">Your app reloaded sucessfully!</p>');
                                $("#cancelScript").hide();
                                $("#dialogNext").hide();
                                $("#goToSheet").show();
                                $("#goToInsights").show();
                            }

                        })
                    }
                    catch (err) {
                    }
                }

                // Function to populate setup UI
                async function createConnectionInterface() {
                    // Check if there are existing SAP Connections
                    var connCheck = await enigma.app.getConnections();

                    // Get app list
                    var apps = await enigma.app.global.getDocList();

                    // Get Bex connections
                    var bexConnections = [];
                    for (var i = 0; i < connCheck.length; i++) {
                        if (connCheck[i].qType == "QvSAPBExConnector.exe") {
                            bexConnections.push(connCheck[i]);
                        }
                    }

                    // Get Meta apps
                    var metaAppList = [];
                    for (var i = 0; i < apps.length; i++) {
                        if (apps[i].qMeta.description.toLowerCase().match(/meta/g)) {
                            metaAppList.push(apps[i]);
                        }
                    }

                    var currentUser = await getUserName(global);

                    // Populate META App Dropdowns
                    for (var i = 0; i < metaAppList.length; i++) {
                        $("#selectMeta").append(`<option value="${metaAppList[i].qDocId}">${metaAppList[i].qDocName}</option>`);
                    }

                    // Populate BEx dropdowns
                    var defaultConnectionId = '';
                    for (var i = 0; i < bexConnections.length; i++) {
                        $("#selectBex").append(`<option value="${bexConnections[i].qId}">${bexConnections[i].qName}</option>`);
                        if (bexConnections[i].qName == `SAP BEx (${currentUser})`) {
                            defaultConnectionId = bexConnections[i].qId
                        }
                    }
                    $('#createBex').on('click', function () {
                        createBexConnectionDialog();
                    })
                }

                function createBexConnectionDialog() {
                    $('body').append(html);

                    // Listener for cancel connection button
                    $('#cancelConnectionButton').on('click', function () {
                        $("#qdcModalConn").remove();
                        $("#qdcLoadDialogConn").remove();
                    })

                    // Listener for OK connection button
                    $('#okConnectionButton').on('click', function () {
                        $("#qdcModalConn").remove();
                        $("#qdcLoadDialogConn").remove();
                    })

                    // Listener for Save Connection button
                    $("#saveConnectionButton").click(async function () {
                        var server = $(`#bexServer`).val();
                        var host = $(`#bexHost`).val();
                        var client = $(`#bexClient`).val();
                        var systemNr = $(`#bexSystemNr`).val();
                        var language = $(`#bexLanguage`).val();
                        var username = $(`#bexUsername`).val();
                        var password = $(`#bexPassword`).val();
                        $("#qdcLoadDialogContent").find('.lui-label').remove();
                        $("#qdcLoadDialogContent").find('.lui-select').remove();
                        $("#qdcLoadDialogContent").find('.lui-input').remove();
                        var customConnectionString = `CUSTOM CONNECT TO "provider=QvSAPBExConnector.exe;servertype=${server};ASHOST=${host};CLIENT=${client};SYSNR=${systemNr};`;
                        customConnectionString += `LANG=${language};Timeout=3600;SNC_MODE=false;SNC_QOP=9;"`;

                        var currentUser = await getUserName(global);
                        var connectionParams = {
                            "qConnection": {
                                "qId": "",
                                "qName": `SAP BEx (${currentUser})`,
                                "qConnectionString": customConnectionString,
                                "qType": `QvSAPBExConnector.exe`,
                                "qUserName": username,
                                "qPassword": password,
                                "qModifiedDate": "",
                                "qMeta": {
                                    "qName": ""
                                },
                                "qLogOn": 0
                            }
                        }
                        try {
                            $('#qdcLoaderConn').show();
                            var connection = await enigma.app.createConnection(connectionParams);
                            $('#qdcLoaderConn').hide();
                            $("#qdcLoadDialogContentConn").text(`Your SAP ${name} Connection was created sucessfully!`);
                            $("#saveConnectionButton").hide();
                            $('#okConnectionButton').show();
                            connection = await enigma.app.getConnection(connection);
                            $(`#selectBex`).append(`<option value="${connection.qId}">${connection.qName}</option>`);
                            $(`#selectBex`).val(connection.qId);
                        }
                        catch (err) {
                            $('#qdcLoaderConn').hide();
                            $("#qdcLoadDialogContentConn").text(`There was an error when creating your SAP ${name} Connection: ${err}`);
                            $("#saveConnectionButton").hide();
                            $('#okConnectionButton').show();
                        }
                    })
                }

                // Listener for next Button in Dialog
                $("#dialogNext").on('click', async function () {
                    switch (dialogStatus) {
                        // From Setup Screen -> Query Selection Screen
                        case 0:
                            setupOn = false;
                            $("#setupHeader").hide();
                            $("#setupContent").hide();
                            $("#step1Header").show();
                            $("#step1Content").show();
                            $('#startSetup').hide();
                            await finishSetup();
                            await checkForSetup();
                            await getFilters();
                            await populateBookmarks();
                            dialogStatus = 1;
                            break;
                        // From Query Selection Screen -> Variable Selection
                        case 1:
                            var goToVariableSelections = await getValueExpression('=If(GetSelectedCount(QUERY_DESC_NAME) = 1 and GetSelectedCount(DIM_CAP_NAM) > 0 and GetSelectedCount(MES_CAP_NAM) > 0, 1, 0)')
                            if (goToVariableSelections == 1) {
                                $("#step1Header").hide();
                                $("#step1Content").hide();
                                $('#resetSelections').hide();
                                $('#clearSelections').hide();
                                $("#backButton").show();
                                $("#step2Header").show();
                                $("#step2Content").show();
                                $("#qbpBookmarkLabel").show();
                                $("#qbpBookmarkName").show();
                                //$("#validateVariables").show();
                                await createVariableTable();
                                dialogStatus = 2
                                break;
                            }
                            else {
                                $("#step1Content").append('<div id="warningToast" class="lui-toast"><span>Please select a query, dimension(s) and measure(s)</span></div>');
                                setTimeout(function () {
                                    $("#warningToast").remove();
                                }, 3000);
                                break;
                            }

                        // From Variable Selection -> App Loading
                        case 2:
                            var checkBox = document.querySelectorAll(".lui-checkbox .lui-checkbox__input:checked");
                            if (checkBox.len = 1) {
                                if ($("#qbpBookmarkName").val() != "") {
                                    createBookmark($("#qbpBookmarkName").val())
                                }
                                else {

                                }
                            }
                            $(".dialogReload").show();
                            $("#backButton").hide();
                            $("#step2Header").hide();
                            $("#step2Content").hide();
                            $("#dialogNext").hide();
                            $("#dialogCancel").hide();
                            //$("#validateVariables").hide();
                            $("#step3Header").show();
                            $("#step3Content").show();
                            $("#cancelScript").show();
                            $("#qdcLoader").show();
                            $("#qbpBookmarkLabel").hide();
                            $("#qbpBookmarkName").hide();
                            startExec();
                            dialogStatus = 3;
                            break;
                    }
                });
            });
        }


        // Function to get bookmarks
        function getBookmarks() {
            return new Promise(async function (resolve, reject) {
                try {
                    var reply = await qdcApp.getList('BookmarkList');
                    resolve(reply.layout.qBookmarkList.qItems);
                }
                catch (err) {
                    reject(err);
                }
            })
        }

        // Function to get username
        async function getUserName(global) {
            return new Promise(async function (resolve, reject) {
                var reply = await global.getAuthenticatedUser();
                currentUser = reply.qReturn;
                currentUser = currentUser.replace('UserDirectory=', '');
                currentUser = currentUser.replace('; UserId=', '_');
                resolve(currentUser);
            })
        }

        // Function to populate bookmakrs
        async function populateBookmarks() {
            try {
                var bookmarksList = await getBookmarks();
                $("#selectBookmark").empty();
                $("#selectBookmark").append('<option value="Default" selected>Select a bookmark...</option>');
                for (var i = 0; i < bookmarksList.length; i++) {
                    $("#selectBookmark").append('<option value="' + bookmarksList[i].qInfo.qId + '" selected>' + bookmarksList[i].qData.title + '</option>');
                }
                $("#selectBookmark").val("Default");
            }
            catch (err) {
            }
        }

        // Function to finish setup
        async function finishSetup() {
            var currentScript = await enigma.app.getScript();
            var sapScript = currentScript.split('//SAPSCRIPTSPLITTER');
            var variableQuery = currentScript.split('//QUERYVARIABLESSPLITTER');
            var otherScripts = currentScript.split('//ENDOFAUTOMATEDSCRIPT');
            var bexConnection = $("#selectBex option:selected").text();
            var metaApp = $("#selectMeta").val();
            qdcApp = await qlik.openApp(metaApp, config);
            var script = '';
            script += "///$tab Qlik BEx Plugin Config\r\n";
            script += `\n//SETUPSPLITTER\n`;
            script += '\n//SETUP HAS BEEN FINISHED \r\n';
            script += `\n//SAPBEXCONN${bexConnection}SAPBEXCONN\r\n`;
            script += `\n//SAPMETAAPP${metaApp}SAPMETAAPP\r\n`;
            script += `\n//SETUPSPLITTER\n`;
            if (variableQuery[1]) {
                script += '//QUERYVARIABLESSPLITTER\n';
                script += variableQuery[1];
                script += '\n//QUERYVARIABLESSPLITTER';
            }
            if (sapScript[1]) {
                script += `\n///$tab SAP\n`;
                script += `\n//SAPSCRIPTSPLITTER\n`;
                script += sapScript[1];
                script += `\n//SAPSCRIPTSPLITTER\n`;
                script += '//ENDOFAUTOMATEDSCRIPT';
            }
            if (otherScripts[1]) {
                script += otherScripts[1];
            }
            await enigma.app.setScript(script);
            if (!$('#setupLogo').length) {
                setupLogo();
            }
        }
    }
}