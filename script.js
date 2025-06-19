document.addEventListener('DOMContentLoaded', () => {
    const numberInput = document.getElementById('numberInput');
    const addNumberBtn = document.getElementById('addNumberBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultsList = document.getElementById('resultsList');
    const latestNumberAnalysisDiv = document.getElementById('latestNumberAnalysis');

    let results = [];
    const WHEEL_NUMBERS = {
        'Voisins du Zéro': [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25], // Corrected Voisins
        'Tiers du Cylindre': [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
        'Orphelins': [17, 34, 6, 1, 20, 14, 31, 9],
        'Zero Spiel': [12, 35, 3, 26, 0, 32, 15]
    };

    // Load results from local storage on page load
    loadResults();

    addNumberBtn.addEventListener('click', addNumber);
    resetBtn.addEventListener('click', resetResults);
    numberInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            addNumber();
        }
    });

    function addNumber() {
        const numberStr = numberInput.value;
        if (numberStr === '') {
            alert('Please enter a number.');
            return;
        }
        const number = parseInt(numberStr);

        if (isNaN(number) || number < 0 || number > 36) {
            alert('Please enter a valid number between 0 and 36.');
            numberInput.value = '';
            return;
        }

        results.push(number);
        renderResults();
        saveResults();
        analyzeNumber(number); // Call analysis for the newly added number
        numberInput.value = '';
        numberInput.focus();
    }

    function renderResults() {
        resultsList.innerHTML = ''; // Clear existing list items
        results.forEach(result => {
            const listItem = document.createElement('li');
            listItem.textContent = result;
            resultsList.appendChild(listItem);
        });
        // Scroll to the bottom of the results list
        resultsList.scrollTop = resultsList.scrollHeight;
    }

    function resetResults() {
        if (confirm('Are you sure you want to reset all results?')) {
            results = [];
            renderResults();
            clearAnalysis();
            localStorage.removeItem('rouletteResults');
        }
    }

    function saveResults() {
        localStorage.setItem('rouletteResults', JSON.stringify(results));
    }

    function loadResults() {
        const storedResults = localStorage.getItem('rouletteResults');
        if (storedResults) {
            results = JSON.parse(storedResults);
            renderResults();
            if (results.length > 0) {
                analyzeNumber(results[results.length - 1]); // Analyze the last number if results were loaded
            }
        }
    }

    function analyzeNumber(number) {
        latestNumberAnalysisDiv.innerHTML = ''; // Clear previous analysis

        const analysisTitle = document.createElement('p');
        analysisTitle.innerHTML = `Analysis for <strong>${number}</strong>:`;
        latestNumberAnalysisDiv.appendChild(analysisTitle);

        let foundInGroup = false;
        for (const groupName in WHEEL_NUMBERS) {
            if (WHEEL_NUMBERS[groupName].includes(number)) {
                const groupP = document.createElement('p');
                groupP.textContent = `Belongs to: ${groupName}`;
                latestNumberAnalysisDiv.appendChild(groupP);
                foundInGroup = true;
            }
        }

        if (!foundInGroup) {
            const noGroupP = document.createElement('p');
            noGroupP.textContent = 'Not part of any major predefined wheel-based group.';
            latestNumberAnalysisDiv.appendChild(noGroupP);
        }
    }

    function clearAnalysis() {
        latestNumberAnalysisDiv.innerHTML = '';
    }
});
