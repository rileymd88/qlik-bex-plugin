# Qlik BEx Plugin

## The Solution
The Qlik BEx Plugin is an add on to the Qlik Visual Anlaytics Platform and brings Governed Self Service within SAP BI environments to the next level.
* It provides an easy way to access data for SAP Bex Users
* It seamlessly integrates Qlik into your exisisting SAP landscape
* It is an extension which can be accessed through the Qlik standard client. Support can be delivered by Qlik Consulting or any Qlik Partner
* You can access SAP data within the user context
* You can reuse any kind of SAP Metadata (e.g. Hierarchies, Security)
* You can easily connect your BEx Queries with other data sources (like other Queries or non SAP Data)


*Important Information*
>This extension code requires packing using the qExt tools to develop it further. You can NOT download the repo and directly install as an extension. To get the correct approved version download from the releases page (file: qlik-bex-plugin.zip) and install directly into Qlik Sense.

* [GitHub releases page](https://github.com/rileymd88/qlik-bex-plugin/releases)

### Requirements
The Qlik BEx Plugin has been tested within the following setups

**Qlik Sense Enterprise**
* April 2018
* June 2018
* September 2018
* November 2018

**Browsers**
* Google Chrome
* Mozilla Firefox
* Internet Explorer 11

**Qlik Connector for SAP**
* 7.0.0
* 7.0.1

### Limitations
*The BEx Plugin uses the Qlik SAP BAPI Connector + the Qlik SAP BEx Connector to retrieve Metadata and Data from SAP. All limitations from those 2 components do apply to the BEx Plugin too. (see BEx Limitations)
* The wizard might not be able to generate valid data load scripts for all kind of BEx query setups (specials types of variables/hierarchies)

#### Step by Step Installation Instruction
1. Qlik Sense Enterprise (as listed above)
2. Qlik Connector for SAP (as listed above)
    a. note: Engine and Service Dispatcher have to be restarted after installation
    b. don't forget to apply a valid license
3. Create a data connection for the Qlik SAP BAPI and the Qlik SAP BEx connector
4. Import the metadata App (Link below)
5. Import the Qlik BEx Plugin Extension found here

## Metadata App
*Important Note:*
>The metadata extraction loads all metadata from the entire BW System (Querys, Dimensions, Measures, Variables and masterdata). Especially the masterdata tables can be huge so your data load script might have an impact on the system performance (both SAP and Qlik side). Keep that in mind and think about to extract only a distinct number of Queries.

### Full Extraction
1. Open the Metadata App within the Data Load Editor
2. Create a folder connection and enter its name in line 2 of the load script
    a. note: this is for storage of metadata QVDs
3. Copy the Metadata extraction script files into this folder
4. Make sure that the name of the data connection in line 9 matches the previously created BAPI connector data connection
5. Make sure that the name of the folder connection is correctly inserted in line 2 of script section "Load Metadata"
6. Execute the load script
![BEX1](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx1.png)
![BEX2](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx2.png)

### Extract Metadata for specific Queries only
1. Open the Metadata App within the Data Load Editor
2. Create a folder connection and enter its name in line 2 of the load script
    a. note: this is for storage of metadata QVDs
3. Copy the Metadata extraction script files into this folder
4. Make sure that the name of the data connection in line 9 matches the previously created BAPI connector data connection
5. Comment line 44 (call LOADALL)
6. Uncomment line 41 (call LOADALL_CUSTOM)
7. Make sure that only line 31 (CALL QUERYS) is uncommented
![BEX3](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx3.png)
8. Execute the load script
9. Open the QUERYS_B7Q.txt file within your folder connection location
10. Delete all Querys instead of those you want to extract
11. Save the file under the name QUERYS_B7Q_custom.txt
12. Uncomment line 44 (call LOADALL)
13. Comment line 41 (call LOADALL_CUSTOM)
14. Execute the load script
    a. note: you will see that the metadata will only be extracted for the dedicated Querys

## Using the Extension
1. Create a new app
2. Add some data to it (e.g. 1 inline table)
    a. reason: you cannot create a sheet if the app contains no data. For production use it is intended that all users to work within 1 per Query
3. Create a new sheet and drag the BEx plugin onto the canvas
![BEX4](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx4.png)
4. Click on setup
    a. The one time setup screen appears (you can re-enter it by using the extension properties option)
    b. note that the Connection and the Metadata App are automatically filled. The Plugin searches for BEx data connections for apps containing the phrase "meta" within the app description (not the app name)
![BEX5](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx5.png)
5. Go ahead and select your query, dimensions and measures
![BEX6](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx6.png)
6. Then enter your variables by either manually typing in the values or by clicking on the search icon to search for your values. Mandatory variables are marked in bold.
![BEX7](https://raw.githubusercontent.com/rileymd88/data/master/qlik-bex-plugin/BEx7.png)
7. Click on next and load the data
8. You can go to sheet editing or directly jump into the insights advisor
    a. note: the BEx Plugin stores your selection and setup information within a special script part
