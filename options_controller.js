// var studentDistributionFiles = [];

// Saves options to chrome.storage
function saveOptions() {
	let semesterSeason = document.getElementById('semester_season').value;
	let year = document.getElementById('year').value;
	// var projectDistribution = document.getElementById('project_distribution').value;
	let submitServerProjectName = document.getElementById('submit_server_project_name').value;
	
	let filesToCheck = document.getElementById('files_to_check').value.split(/\s*,\s*/);
	let ignoredNames = document.getElementById('names_to_ignore').value.split(/\s*,\s*/);
	let ignoredMethods = JSON.parse(document.getElementById('methods_to_ignore').value);

	chrome.storage.sync.set({
		semesterSeason: semesterSeason,
		year: year,
		// studentDistributionFiles: studentDistributionFiles,
		submitServerProjectName: submitServerProjectName,
		filesToCheck: filesToCheck,
		ignoredNames: ignoredNames,
		ignoredMethods: ignoredMethods
	}, function() {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = 'Options saved.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	});
}

// Restores options based on values stored in chrome.storage.
function restoreOptionsLocal() {
	restoreOptions(
		function(items) {
			document.getElementById('semester_season').value = items.semesterSeason;
			document.getElementById('year').value = items.year;
			// studentDistributionFiles = items.studentDistributionFiles;
			// $("#loaded_files")[0].value = compileLoadedFileDescription();
			document.getElementById('submit_server_project_name').value = items.submitServerProjectName;
			document.getElementById('files_to_check').value = items.filesToCheck.join(", ");
			document.getElementById('names_to_ignore').value = items.ignoredNames.join(", ");
			document.getElementById('methods_to_ignore').value = JSON.stringify(items.ignoredMethods);
		}
	);
}

document.addEventListener('DOMContentLoaded', restoreOptionsLocal);
document.getElementById('save').addEventListener('click', saveOptions);