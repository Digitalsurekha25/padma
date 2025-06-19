document.addEventListener('DOMContentLoaded', () => {
    const numberInput = document.getElementById('numberInput');
    const addNumberBtn = document.getElementById('addNumberBtn');
    const resetBtn = document.getElementById('resetBtn');
    const resultsList = document.getElementById('resultsList');
    const latestNumberAnalysisDiv = document.getElementById('latestNumberAnalysis');
    const hitFrequencyDiv = document.getElementById('hitFrequencyAnalysis');
    const hotColdDiv = document.getElementById('hotColdAnalysis');
    const lastSeenDiv = document.getElementById('lastSeenAnalysis');
    const repeaterSleepersDiv = document.getElementById('repeaterSleepersAnalysis');
    const distanceAnalysisDiv = document.getElementById('distanceAnalysis');
    const basicPropsDiv = document.getElementById('basicPropsAnalysis'); // Add this selector
    const positionalPropsDiv = document.getElementById('positionalPropsAnalysis'); // Add this selector

    let results = [];
    let numberCounts = {}; // Declare here
    let lastSeenAtSpin = {}; // Stores { number: spinIndex }
    let appearanceIndexes = {}; // { number: [spinIndex1, spinIndex2, ...] }

    const HOT_COLD_RANGE = 20; // Analyze last 20 numbers
    const HOT_COUNT = 3;       // Display top 3 hot numbers
    const COLD_COUNT = 3;      // Display bottom 3 cold numbers (or numbers not seen)
    const SLEEPER_THRESHOLD = 35; // Example: A number is a sleeper if not seen in 35 spins.

    // Table-Based Groupings Definitions
    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    const DOZENS = {
        '1st Dozen': { min: 1, max: 12, numbers: Array.from({length: 12}, (_, i) => i + 1) },
        '2nd Dozen': { min: 13, max: 24, numbers: Array.from({length: 12}, (_, i) => i + 13) },
        '3rd Dozen': { min: 25, max: 36, numbers: Array.from({length: 12}, (_, i) => i + 25) }
    };

    const COLUMNS = {
        'Column 1': [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
        'Column 2': [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        'Column 3': [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    };

    const HIGH_LOW = {
        'Low': { min: 1, max: 18 },
        'High': { min: 19, max: 36 }
    };
    // Even/Odd will be calculated directly: num % 2 === 0 (for num > 0)
    // Number 0 is generally not included in these main categories.

    const WHEEL_NUMBERS = {
        'Voisins du Zéro': [22, 18, 29, 7, 28, 12, 35, 3, 26, 0, 32, 15, 19, 4, 21, 2, 25], // Corrected Voisins
        'Tiers du Cylindre': [27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33],
        'Orphelins': [17, 34, 6, 1, 20, 14, 31, 9],
        'Zero Spiel': [12, 35, 3, 26, 0, 32, 15]
    };

    function initializeNumberCounts() {
        numberCounts = {};
        for (let i = 0; i <= 36; i++) {
            numberCounts[i] = 0;
        }
    }

    function initializeLastSeen() {
        lastSeenAtSpin = {};
        for (let i = 0; i <= 36; i++) {
            lastSeenAtSpin[i] = -1; // -1 indicates never seen
        }
    }

    function initializeAppearanceIndexes() {
        appearanceIndexes = {};
        for (let i = 0; i <= 36; i++) {
            appearanceIndexes[i] = [];
        }
    }

    initializeNumberCounts();
    initializeLastSeen();
    initializeAppearanceIndexes(); // Initialize on script load

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
        if (numberCounts[number] !== undefined) {
            numberCounts[number]++;
        } else {
            numberCounts[number] = 1; // Should not happen if initialized correctly
        }
        const currentSpinIndex = results.length - 1; // Index of the newly added number
        lastSeenAtSpin[number] = currentSpinIndex;

        if (!appearanceIndexes[number]) {
            appearanceIndexes[number] = [];
        }
        appearanceIndexes[number].push(currentSpinIndex);

        renderResults();
        saveResults();
        analyzeNumber(number);
        updateHitFrequencyDisplay();
        updateHotColdAnalysis();
        updateLastSeenDisplay();
        updateRepeatersAnalysis();
        updateSleepersAnalysis();
        updateDistanceAnalysis();
        updateTableGroupAnalysis(number); // Pass the newly added number
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
            initializeNumberCounts();
            initializeLastSeen();
            initializeAppearanceIndexes(); // Add this call

            renderResults();
            clearAnalysis(); // Clears wheel group analysis

            // Update all statistical displays to show empty/initial state
            updateHitFrequencyDisplay();
            updateHotColdAnalysis();
            updateLastSeenDisplay();
            updateRepeatersAnalysis();
            updateSleepersAnalysis();
            updateDistanceAnalysis();
            updateTableGroupAnalysis(null); // To clear the display

            localStorage.removeItem('rouletteResults');
        }
    }

    function saveResults() {
        // Save numberCounts along with results or recalculate on load
        // For simplicity now, we'll recalculate on load.
        localStorage.setItem('rouletteResults', JSON.stringify(results));
    }

    function loadResults() {
        const storedResults = localStorage.getItem('rouletteResults');

        initializeNumberCounts();
        initializeLastSeen();
        initializeAppearanceIndexes(); // Correctly placed

        if (storedResults) {
            results = JSON.parse(storedResults);

            results.forEach(num => {
                if (numberCounts[num] !== undefined) numberCounts[num]++;
            });

            results.forEach((num, index) => {
                lastSeenAtSpin[num] = index;
            });

            results.forEach((num, index) => { // Rebuild appearanceIndexes
                // appearanceIndexes[num] is already an array due to initializeAppearanceIndexes
                appearanceIndexes[num].push(index);
            });

            renderResults();
            if (results.length > 0) {
                analyzeNumber(results[results.length - 1]);
            }
        }
        updateHitFrequencyDisplay();
        updateHotColdAnalysis();
        updateLastSeenDisplay();
        updateRepeatersAnalysis();
        updateSleepersAnalysis();
        updateDistanceAnalysis();
        if (results.length > 0) {
            updateTableGroupAnalysis(results[results.length - 1]); // Analyze last loaded number
        } else {
            updateTableGroupAnalysis(null); // Clear if no results
        }
    }

    function updateTableGroupAnalysis(num) {
        // Clear previous content in basicPropsDiv and positionalPropsDiv
        // Ensure H4 titles are preserved
        let basicContent = basicPropsDiv.querySelector('.content');
        if (!basicContent) {
            basicContent = document.createElement('div');
            basicContent.className = 'content';
            const h4 = basicPropsDiv.querySelector('h4');
            if (h4 && h4.nextSibling) basicPropsDiv.insertBefore(basicContent, h4.nextSibling);
            else if (h4) basicPropsDiv.appendChild(basicContent);
            else basicPropsDiv.appendChild(basicContent);
        }
        basicContent.innerHTML = '';

        let positionalContent = positionalPropsDiv.querySelector('.content');
        if (!positionalContent) {
            positionalContent = document.createElement('div');
            positionalContent.className = 'content';
            const h4 = positionalPropsDiv.querySelector('h4');
            if (h4 && h4.nextSibling) positionalPropsDiv.insertBefore(positionalContent, h4.nextSibling);
            else if (h4) positionalPropsDiv.appendChild(positionalContent);
            else positionalPropsDiv.appendChild(positionalContent);
        }
        positionalContent.innerHTML = '';

        if (results.length === 0 && num === null) { // Explicitly checking num === null for reset/initial clear
            basicContent.textContent = 'No number selected for analysis.';
            positionalContent.textContent = 'No number selected for analysis.';
            return;
        }

        const currentNumber = (typeof num === 'number') ? num : (results.length > 0 ? results[results.length -1] : null);
        if (currentNumber === null) { // Handles cases where results might be empty but num wasn't explicitly null
             basicContent.textContent = 'No number available for analysis.';
            positionalContent.textContent = 'No number available for analysis.';
            return;
        }

        // --- Basic Properties ---
        const propsList = document.createElement('ul');
        propsList.style.paddingLeft = '0'; propsList.style.listStyleType = 'none';

        // Even/Odd
        let evenOddText = 'N/A (0)';
        if (currentNumber > 0) {
            evenOddText = (currentNumber % 2 === 0) ? 'Even' : 'Odd';
        }
        const eoLi = document.createElement('li');
        eoLi.textContent = `Even/Odd: ${evenOddText}`;
        propsList.appendChild(eoLi);

        // Red/Black
        let colorText = 'Green (0)'; // Or just N/A for 0
        if (RED_NUMBERS.includes(currentNumber)) {
            colorText = 'Red';
        } else if (BLACK_NUMBERS.includes(currentNumber)) {
            colorText = 'Black';
        }
        const rbLi = document.createElement('li');
        rbLi.textContent = `Color: ${colorText}`;
        propsList.appendChild(rbLi);

        // High/Low
        let highLowText = 'N/A (0)';
        if (currentNumber >= HIGH_LOW.Low.min && currentNumber <= HIGH_LOW.Low.max) {
            highLowText = 'Low (1-18)';
        } else if (currentNumber >= HIGH_LOW.High.min && currentNumber <= HIGH_LOW.High.max) {
            highLowText = 'High (19-36)';
        }
        const hlLi = document.createElement('li');
        hlLi.textContent = `Range: ${highLowText}`;
        propsList.appendChild(hlLi);
        basicContent.appendChild(propsList);

        // --- Positional Properties ---
        const posList = document.createElement('ul');
        posList.style.paddingLeft = '0'; posList.style.listStyleType = 'none';

        // Dozen
        let dozenText = 'N/A (0)';
        for (const dozenName in DOZENS) {
            if (currentNumber >= DOZENS[dozenName].min && currentNumber <= DOZENS[dozenName].max) {
                dozenText = dozenName;
                break;
            }
        }
        const dozLi = document.createElement('li');
        dozLi.textContent = `Dozen: ${dozenText}`;
        posList.appendChild(dozLi);

        // Column
        let columnText = 'N/A (0)';
        for (const colName in COLUMNS) {
            if (COLUMNS[colName].includes(currentNumber)) {
                columnText = colName;
                break;
            }
        }
        const colLi = document.createElement('li');
        colLi.textContent = `Column: ${columnText}`;
        posList.appendChild(colLi);
        positionalContent.appendChild(posList);
    }

    function updateDistanceAnalysis() {
        let contentDiv = distanceAnalysisDiv.querySelector('.content');
        if (!contentDiv) {
            const h4Title = distanceAnalysisDiv.querySelector('h4');
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            if(h4Title && h4Title.nextSibling){
                distanceAnalysisDiv.insertBefore(contentDiv, h4Title.nextSibling);
            } else if (h4Title) {
                distanceAnalysisDiv.appendChild(contentDiv);
            } else {
                distanceAnalysisDiv.appendChild(contentDiv);
            }
        }
        contentDiv.innerHTML = '';

        if (results.length < 2) { // Need at least two results to potentially have a repeat
            contentDiv.textContent = 'Not enough data for distance/gap analysis.';
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        ul.style.maxHeight = '150px';
        ul.style.overflowY = 'auto';
        ul.style.border = '1px solid #eee';
        ul.style.padding = '5px';

        let foundAnyGaps = false;
        for (let i = 0; i <= 36; i++) {
            const appearances = appearanceIndexes[i];
            if (appearances && appearances.length >= 2) {
                foundAnyGaps = true;
                const gaps = [];
                for (let j = 1; j < appearances.length; j++) {
                    const gap = (appearances[j] - appearances[j-1]) - 1;
                    gaps.push(gap);
                }

                const li = document.createElement('li');
                li.style.padding = '2px 0';
                li.textContent = `Number ${i}: Gaps of [${gaps.join(', ')}] spins.`;
                // Optionally, add average gap:
                // const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
                // li.textContent += ` (Avg: ${avgGap.toFixed(1)})`;
                ul.appendChild(li);
            }
        }

        if (!foundAnyGaps) {
            contentDiv.textContent = 'No numbers have repeated yet to calculate gaps.';
        } else {
            contentDiv.appendChild(ul);
        }
    }

    function updateSleepersAnalysis() {
        // Similar structure to updateRepeatersAnalysis for creating its own section
        let sleepersSectionDiv = repeaterSleepersDiv.querySelector('div.sleepers-section');
        if (!sleepersSectionDiv) {
            sleepersSectionDiv = document.createElement('div');
            sleepersSectionDiv.className = 'sleepers-section';

            const h5 = document.createElement('h5');
            h5.textContent = 'Sleepers';
            sleepersSectionDiv.appendChild(h5);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            sleepersSectionDiv.appendChild(contentDiv);

            // Append sleepersSectionDiv after repeatersSectionDiv if it exists, or after H4
            const repeatersSection = repeaterSleepersDiv.querySelector('div.repeaters-section');
            if (repeatersSection && repeatersSection.nextSibling) {
                repeaterSleepersDiv.insertBefore(sleepersSectionDiv, repeatersSection.nextSibling);
            } else if (repeatersSection) {
                repeaterSleepersDiv.appendChild(sleepersSectionDiv);
            } else { // Fallback if repeaters section wasn't created for some reason
                const mainH4 = repeaterSleepersDiv.querySelector('h4');
                if (mainH4 && mainH4.nextSibling) {
                    repeaterSleepersDiv.insertBefore(sleepersSectionDiv, mainH4.nextSibling);
                } else {
                    repeaterSleepersDiv.appendChild(sleepersSectionDiv);
                }
            }
        }

        const contentDisplay = sleepersSectionDiv.querySelector('.content');
        contentDisplay.innerHTML = ''; // Clear previous sleeper content

        if (results.length === 0) {
            contentDisplay.textContent = 'No results yet to determine sleepers.';
            return;
        }

        const sleepers = [];
        const currentOverallSpinIndex = results.length - 1;

        for (let i = 0; i <= 36; i++) {
            const seenAtIndex = lastSeenAtSpin[i];
            let spinsAgo;

            if (seenAtIndex !== -1) { // If seen before
                spinsAgo = currentOverallSpinIndex - seenAtIndex;
            } else { // Never seen
                spinsAgo = results.length; // Treat as not seen for all recorded spins
            }

            if (spinsAgo >= SLEEPER_THRESHOLD) {
                sleepers.push({ number: i, spinsAgo: spinsAgo });
            }
        }

        if (sleepers.length > 0) {
            const ul = document.createElement('ul');
            ul.style.listStyleType = 'none';
            ul.style.padding = '0';
            sleepers.sort((a,b) => b.spinsAgo - a.spinsAgo); // Show longest sleepers first
            sleepers.forEach(sleeper => {
                const li = document.createElement('li');
                li.textContent = `Number ${sleeper.number} (not seen for ${sleeper.spinsAgo} spins)`;
                ul.appendChild(li);
            });
            contentDisplay.appendChild(ul);
        } else {
            contentDisplay.textContent = `No numbers currently sleeping for ${SLEEPER_THRESHOLD} or more spins.`;
        }
    }

    function updateRepeatersAnalysis() {
        // Ensure main H4 title exists from HTML
        // Let's manage sub-sections more directly.

        let repeatersSectionDiv = repeaterSleepersDiv.querySelector('div.repeaters-section');
        if (!repeatersSectionDiv) {
            repeatersSectionDiv = document.createElement('div');
            repeatersSectionDiv.className = 'repeaters-section';

            const h5 = document.createElement('h5');
            h5.textContent = 'Repeaters';
            repeatersSectionDiv.appendChild(h5);

            const contentDiv = document.createElement('div');
            contentDiv.className = 'content'; // This will be where text goes
            repeatersSectionDiv.appendChild(contentDiv);

            // Find a good place to append this new section within repeaterSleepersDiv
            // e.g., after the main H4, or just append if nothing else complex is there yet.
            const mainH4 = repeaterSleepersDiv.querySelector('h4');
            if (mainH4 && mainH4.nextSibling) {
                repeaterSleepersDiv.insertBefore(repeatersSectionDiv, mainH4.nextSibling);
            } else {
                repeaterSleepersDiv.appendChild(repeatersSectionDiv);
            }
        }

        const contentDisplay = repeatersSectionDiv.querySelector('.content');
        contentDisplay.innerHTML = ''; // Clear previous repeater content in this specific section

        if (results.length < 2) {
            contentDisplay.textContent = 'Not enough data to check for repeaters.';
            return;
        }

        const lastNumber = results[results.length - 1];
        const penultimateNumber = results[results.length - 2];

        if (lastNumber === penultimateNumber) {
            const p = document.createElement('p');
            p.style.color = 'green'; // Highlight repeaters
            p.innerHTML = `<strong>Direct Repeater!</strong> Number ${lastNumber} appeared consecutively.`;
            contentDisplay.appendChild(p);
        } else {
            contentDisplay.textContent = 'No direct repeater in the latest spin.';
        }
    }

    function updateLastSeenDisplay() {
        let contentDiv = lastSeenDiv.querySelector('.content');
        if (!contentDiv) {
            const h4Title = lastSeenDiv.querySelector('h4');
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            if(h4Title && h4Title.nextSibling){
                lastSeenDiv.insertBefore(contentDiv, h4Title.nextSibling);
            } else if (h4Title) {
                lastSeenDiv.appendChild(contentDiv);
            } else { // Should not happen if HTML is correct
                lastSeenDiv.appendChild(contentDiv);
            }
        }
        contentDiv.innerHTML = '';

        if (results.length === 0) {
            contentDiv.textContent = 'No results yet.';
            return;
        }

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        ul.style.maxHeight = '150px';
        ul.style.overflowY = 'auto';
        ul.style.border = '1px solid #eee';
        ul.style.padding = '5px';

        const currentOverallSpinIndex = results.length - 1;

        for (let i = 0; i <= 36; i++) {
            const li = document.createElement('li');
            li.style.padding = '2px 0';
            if (lastSeenAtSpin[i] !== -1) { // If number has been seen
                const spinsAgo = currentOverallSpinIndex - lastSeenAtSpin[i];
                if (spinsAgo === 0) {
                     li.textContent = `Number ${i}: seen this spin`;
                } else {
                     li.textContent = `Number ${i}: seen ${spinsAgo} spin(s) ago`;
                }
            } else { // Never seen
                li.textContent = `Number ${i}: never seen`;
            }
            ul.appendChild(li);
        }
        contentDiv.appendChild(ul);
    }

    function updateHotColdAnalysis() {
        // const hotColdDiv = document.getElementById('hotColdAnalysis'); // Already selected
        let contentDiv = hotColdDiv.querySelector('.content');
        if (!contentDiv) {
            const h4Title = hotColdDiv.querySelector('h4');
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            if(h4Title && h4Title.nextSibling){
                hotColdDiv.insertBefore(contentDiv, h4Title.nextSibling);
            } else if (h4Title) {
                hotColdDiv.appendChild(contentDiv);
            } else {
                hotColdDiv.appendChild(contentDiv);
            }
        }
        contentDiv.innerHTML = ''; // Clear previous content

        const relevantResults = results.slice(-HOT_COLD_RANGE);

        if (relevantResults.length === 0) {
            contentDiv.textContent = 'Not enough data for Hot/Cold analysis.';
            return;
        }

        const rangeCounts = {};
        for (let i = 0; i <= 36; i++) {
            rangeCounts[i] = 0;
        }
        relevantResults.forEach(num => {
            rangeCounts[num]++;
        });

        const numbersByFrequency = [];
        for (let i = 0; i <= 36; i++) {
            numbersByFrequency.push({ number: i, count: rangeCounts[i] });
        }

        // Sort for Hot numbers (descending frequency, then by number asc for ties)
        numbersByFrequency.sort((a, b) => {
            if (b.count === a.count) {
                return a.number - b.number;
            }
            return b.count - a.count;
        });

        const hotNumbers = numbersByFrequency.slice(0, HOT_COUNT).filter(item => item.count > 0);

        // Sort for Cold numbers (ascending frequency, then by number asc for ties)
        // We are interested in numbers that appeared least or not at all in the range
        const coldCandidates = [];
        for (let i = 0; i <= 36; i++) {
            coldCandidates.push({ number: i, count: rangeCounts[i] });
        }
        coldCandidates.sort((a, b) => {
            if (a.count === b.count) {
                return a.number - b.number;
            }
            return a.count - b.count;
        });
        const coldNumbers = coldCandidates.slice(0, COLD_COUNT);

        const hotP = document.createElement('p');
        hotP.innerHTML = `<strong>Hot (last ${HOT_COLD_RANGE} spins):</strong> ${hotNumbers.length > 0 ? hotNumbers.map(item => `${item.number} (${item.count}x)`).join(', ') : 'N/A'}`;
        contentDiv.appendChild(hotP);

        const coldP = document.createElement('p');
        coldP.innerHTML = `<strong>Cold (last ${HOT_COLD_RANGE} spins):</strong> ${coldNumbers.length > 0 ? coldNumbers.map(item => `${item.number} (${item.count}x)`).join(', ') : 'N/A'}`;
        contentDiv.appendChild(coldP);
    }

    function updateHitFrequencyDisplay() {
        // const hitFrequencyDiv = document.getElementById('hitFrequencyAnalysis'); // Already selected above
        let contentDiv = hitFrequencyDiv.querySelector('.content');
        if (!contentDiv) {
            const h4Title = hitFrequencyDiv.querySelector('h4'); // Keep the title
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            // Insert contentDiv after the h4 title
            if(h4Title && h4Title.nextSibling) {
                hitFrequencyDiv.insertBefore(contentDiv, h4Title.nextSibling);
            } else if (h4Title) {
                hitFrequencyDiv.appendChild(contentDiv);
            } else { // If no h4, just append
                hitFrequencyDiv.appendChild(contentDiv);
            }
        }
        contentDiv.innerHTML = '';

        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0'; // Ensure no default ul margin
        ul.style.maxHeight = '150px';
        ul.style.overflowY = 'auto';
        ul.style.border = '1px solid #eee'; // Optional: for better visual grouping
        ul.style.padding = '5px';


        for (let i = 0; i <= 36; i++) {
            // Only display if count is defined (it always should be after init)
            const li = document.createElement('li');
            li.textContent = `Number ${i}: ${numberCounts[i]} time(s)`;
            li.style.padding = '2px 0';
            ul.appendChild(li);
        }
        contentDiv.appendChild(ul);
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

    // Initial calls on page load:
    loadResults(); // This will also call updateHitFrequencyDisplay
});
