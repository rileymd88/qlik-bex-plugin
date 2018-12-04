// JavaScript
define(['jquery'], function ($) {
    'use strict';
    var setupSwitch = {
        ref: "setupOn",
        label: "Show Setup Screen",
        component: 'button',
        default: false,
        action: function () {
            $("#buttonPlugin").attr("setup", '{"setupOn": true, "dialogStatus": 0}');
            $("#buttonPlugin").click();
            $("#step1Header").hide();
            $("#step1Content").hide();
            $("#step2Header").hide();
            $("#step2Content").hide();
            $("#backButton").hide();
        }
    };

    var bexStartingPoint = {
        ref: "bexStartingPoint",
        label: "Starting Screen",
        component: 'dropdown',
        options: [
            {
                value: 2,
                label: "Variable Screen"
            },
            {
                value: 1,
                label: "Query Screen"
            },
        ],
        default: 2
    }

    var hideElement = {
        ref: "hideElement",
        label: "Hide Element:",
        component: 'switch',
        type: "boolean",
        options: [{
            value: false,
            label: "No"
        }, {
            value: true,
            label: "Yes"
        }
        ],
        default: false
    }

    var currencyUnit = {
        ref: "currencyUnit",
        label: "Load Currency & Unit:",
        component: 'switch',
        type: "boolean",
        options: [{
            value: false,
            label: "No"
        }, {
            value: true,
            label: "Yes"
        }
        ],
        default: false
    }

    var masterItems = {
        ref: "masterItems",
        label: "Create Master-Items:",
        component: 'switch',
        type: "boolean",
        options: [{
            value: false,
            label: "No"
        }, {
            value: true,
            label: "Yes"
        }
        ],
        default: true
    }

    var pluginOptions = {
        label: "Options",
        items: {
            settings: {
                type: "items",
                label: "Options",
                items: {
                    currencyUnit: currencyUnit,
                    masterItems: masterItems,
                    hideElement: hideElement
                }
            }
        }
    }

    var dataSection = {
        component: "expandable-items",
        label: "Setup",
        items: {
            setupSwitch: setupSwitch,
            startingPoint: bexStartingPoint,
            pluginOptions: pluginOptions
        }
    };

    return {
        type: "items",
        component: "accordion",
        label: "Setup",
        items: {
            dataSection: dataSection
        }
    };
});