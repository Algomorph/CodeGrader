# CodeStyleGradingAid
A Chrome browser plugin for aiding the teaching assistants grade code style on student's homework project submissions at the CS department of University of Maryland, College Park.

Current basic usage (before this is published):

1) Clone this repository.
2) In chrome://extensions, enable developer mode.
3) In chrome://extensions, click "Load Unpacked", navigate to repo root and accept.
4) Right-click the extension icon in Chrome (in the upper-right corner) go to "Options", and fill these out or load from disk. Example options can be found in the `sample_options` folder. 
5) On the submit server, hit "Overview" next to the desired project / exam / assignment. You will see "REVIEW" links being generated in the "on time" column (or "late" column if there are no on time submissions).
6) Click on the REVIEW links as necessary.
7) To make a comment double click on a line, type the comment and click "Save" OR double click on one of the colored box suggestions and it will autogenerate a comment. Make sure "Request Reply?" is unticked or this will email a student with the comment(automatically unchecked). 
8) You need to have your grades server open in a chrome tab to submit grades. It should look like: `https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=****`. After typing in their final score on the plugin, click "REPORT TO GRADE SERVER" and it will open up a the students grade page with the score and comments you provided. Finally, submit the form by clicking "Save Changes".

Coming soon: 

1) Thorough options reference documentation, and a detailed usage tutorial.
2) Tons of bugfixes in existing modules.
3) Code Replication module
4) Grade server module:
    1. Auto-generated reports based on review comments in the code, transferable to the UMD grades server assignment 
    comment section with a click of a button.
    2. Setting style scores directly within the review UI panel and transferring them to UMD grade server with a click 
    of a button.
