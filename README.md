# CodeGrader
CodeGrader is a Chrome browser plugin that helps Teaching Assistants at the CS department of University of Maryland, College Park 
grade student code assignments.

Many code problems, such as style, logic replication, and usage of disallowed language features
cannot be addressed by conventional automated testing. Hence, these had to be graded manually
in the past by human graders. CodeGrader automates certain parts of this process, such as detection
of potential problems mentioned above as well as generation and reporting of feedback for the students. 
It also keeps the human grader in the loop to exercise judgement and customize feedback in corner cases. 

## Screenshots 

#### (seeing is believing)

![Screenshot 1](https://raw.githubusercontent.com/Algomorph/CodeStyleGradingAid/master/screenshots/GraidingAidScreenshot1.png)
![Screenshot 2](https://raw.githubusercontent.com/Algomorph/CodeStyleGradingAid/master/screenshots/GraidingAidScreenshot2.png)

## Installation

### Installation from the Chrome Web Store
The latest release of the plugin is available in the Chrome Web Store.
Simply navigate to this [link](https://chrome.google.com/webstore/detail/codegrader/pbpjjhcjbinhnhehhhmflhpmgciaccco), 
and click the "Add to Chrome" button. 



### Installation from Source
To get the most up-to-date version with the latest bugfixes, follow the following steps:

1) Clone this repository.
2) In chrome://extensions, enable developer mode.
3) In chrome://extensions, click "Load Unpacked", navigate to repo root and accept.

Note: if you already had the plugin installed *in any way* before installing from source, please make sure that you have 
the previous installation removed before you install the newer version. 
You can do so by navigating to chrome://extensions in the address bar and clicking the "Remove" button under the 
CodeGrader extension tile.


## Usage

### Configuring CodeGrader
Before you can use CodeGrader on to grade submissions of a specific coding assignment, CodeGrader 
options have to be configured for that assignment. Typically, there is a lead grading TA who distributes 
the CodeGrader options for a specific assignment to all grading TAs. Here is how you can load the options
from disk and/or modify the options.


1) Right-click the extension icon in Chrome (in the upper-right corner, if you have it pinned).
2) Click on "Options". This loads up the CodeGrader Options page. 
3) Here, you can use the "Load from disk..." button at the top if you have an options file or
   are starting from a sample file from the `sample_options` folder. Otherwise, you'll have to 
   edit the defaults and hit "Save" at the top.
   
Example options are already available for most CMSC132 projects and some of the quizzes/exams
via the [sample_options/CMSC132](https://github.com/Algomorph/CodeGrader/tree/master/sample_options/CMSC132) folder. 
These only need to be modified slightly for each new Semester.

If you are a lead TA distributing the options to others, or if you want to retain a copy of
the options fine-tuned to your specific needs for use at a later time, you can use the "Save to disk..." 
button to retain a copy of the current options on your hard drive. 

Note: By design, option files saved from older versions of CodeGrader are most often compatible with
newer versions.

### Grading student assignments with CodeGrader

We recently came up with a promotional video, which includes a [video tutorial](https://youtu.be/IWGZFUhiQbg?t=392) that covers all topics below in even grader detail.
Note: the link will start the video from 6:31, which is when the tutorial itself begins.

We provide some guidance below as well.

#### Loading students code
1) Make sure you have CodeGrader configured for the assignment you are grading (see instructions 
   above on how to do this.)
2) On the Submit Server, hit "Overview" next to the desired project / exam / assignment. 
   You will see "REVIEW" links being generated in the "on time" column (or "late" column in case the 
   late submission is the one that needs to be graded based on the course late-submission policy).
3) Click on the REVIEW links as necessary. Each one will open an new Chrome tab where you can review 
   the corresponding student's code and submit a grade.

#### Reviewing the students code and providing feedback
1) Survey the CodeGrader output in the right-hand UI panel. Clicking on links will scroll your view down
   to the auto-detected entity in the code.
2) To auto-generate a comment about a problem or item in the code, you can click on one of the tags generated 
   by CodeGrader at the end of the line where it auto-detected the entity. To edit any comment, simply click 
   on it and alter the text.
3) To make a comment about a custom location, double-click on the student's code on this line, type the comment, and 
   click "Save". **Important**: make sure "Request Reply?", 
   which is automatically unchecked by default, *stays unchecked*, or this will email a student with the comment!
   
#### Reporting the student's grade and feedback
1) Prior to reporting, make sure you have your first name and last initial, e.g. "Greg K.", entered for 
   `graderName` in the options. Consult the section on [configuration](https://github.com/Algomorph/CodeGrader#configuring-codegrader) on how to get to the
   Options page.
1) In order to report grades and feedback, you'll need to have the Grades Server overview page for the corresponding class 
   open in a separate Chrome tab. The URL should look like: `https://grades.cs.umd.edu/classWeb/viewGrades.cgi?courseID=****`.
2) After typing in a student's score in the right-hand plugin UI panel,
   click "REPORT TO GRADE SERVER" at the bottom. This it will typically open up the corresponding student's 
   grade page with the score and comments you provided. If it ends up opening a new empty tab instead,
   this means you need to refresh your Grades Server tab with the course overview and try the button again
   on your Submit Server review tab for the student. 
3) Review the feedback and submit the form by clicking "Save Changes". The content will be saved, and
   the student's Grade Server tab will close automatically.

### Upcoming Features 

1) A more thorough options reference documentation.
2) Tons of bugfixes in existing modules.
3) A code replication module.
4) Syntax highlighting on the Submit Server.
5) Inner class resolution.
6) Full method call chain resolution.
7) Custom auto-generated message templates for specific code issues.

And much more...
   
   

