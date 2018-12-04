// General config to server
var config = {
	host: window.location.host,
	prefix: "/",
	port: window.location.port,
	isSecure: true
};

// Config for SAP Meta Data app
var qdcConfig = {
	appId: "f1c582fe-792a-4340-8cfa-8ccd968c1f27",
	bexQueryDesc: "qyJyLCx",
	dimensions: "aKkvJ",
	measures: "CKhWABg"
};

// Config which allows end users to select a meta app or create a new BEx Connection
var sapConfig = {
	endUserSetup: true
}

// Config for local script settings
var localsettings = "";
localsettings += "///$tab Main\r\n";
localsettings += "SET ThousandSep=',';\n";
localsettings += "SET DecimalSep='.';\n";
localsettings += "SET MoneyThousandSep=',';\n";
localsettings += "SET MoneyDecimalSep='.';\n";
localsettings += "SET MoneyFormat='#.##0,00 €;-#.##0,00 €';\n";
localsettings += "SET TimeFormat='hh:mm:ss';\n";
localsettings += "SET DateFormat='DD.MM.YYYY';\n";
localsettings += "SET TimestampFormat='DD.MM.YYYY hh:mm:ss[.fff]';\n";
localsettings += "SET MonthNames='Jan;Feb;Mrz;Apr;Mai;Jun;Jul;Aug;Sep;Okt;Nov;Dez';\n";
localsettings += "SET DayNames='Mo;Di;Mi;Do;Fr;Sa;So';\n";
localsettings += "SET LongMonthNames='Januar;Februar;März;April;Mai;Juni;Juli;August;September;Oktober;November;Dezember';\n";
localsettings += "SET LongDayNames='Montag;Dienstag;Mittwoch;Donnerstag;Freitag;Samstag;Sonntag';\n";
localsettings += "SET FirstWeekDay=0;\n";
localsettings += "SET BrokenWeeks=0;\n";
localsettings += "SET ReferenceDay=4;\n";
localsettings += "SET FirstMonthOfYear=1;\n";
localsettings += "SET CollationLocale='de-DE';\n";








