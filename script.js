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
    const basicPropsDiv = document.getElementById('basicPropsAnalysis');
    const positionalPropsDiv = document.getElementById('positionalPropsAnalysis');
    const advancedTablePropsDiv = document.getElementById('advancedTablePropsAnalysis');
    const rouletteWheelSvgContainer = document.getElementById('rouletteWheelSvgContainer');
    const neighborAnalysisDisplayDiv = document.getElementById('neighborAnalysisDisplay'); // Add this selector
    const wheelDistanceDisplayDiv = document.getElementById('wheelDistanceDisplay'); // Add this selector
    const sectorMovementDisplayDiv = document.getElementById('sectorMovementDisplay'); // Add this selector


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

    // European Roulette Wheel Sequence (Clockwise)
    const EUROPEAN_WHEEL_ORDER = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8,
        23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28,
        12, 35, 3, 26
    ];

    const WHEEL_NUMBER_TO_INDEX_MAP = new Map();
    EUROPEAN_WHEEL_ORDER.forEach((number, index) => {
        WHEEL_NUMBER_TO_INDEX_MAP.set(number, index);
    });

    // Potential future storage for wheel cluster patterns, e.g.:
    // let wheelGapsHistory = [];
    // let neighborHitStats = {};
    // For now, most wheel cluster analysis will be calculated on-the-fly or
    // update simple stats directly in display functions.

    let sectorHitCounts = {};
    let sectorLastSeenSpin = {};
    let currentConsecutiveSector = { name: null, count: 0 };

    function initializeSectorStats() {
        sectorHitCounts = {};
        sectorLastSeenSpin = {};
        currentConsecutiveSector = { name: null, count: 0 };
        for (const sectorName in WHEEL_NUMBERS) { // WHEEL_NUMBERS from earlier step
            sectorHitCounts[sectorName] = 0;
            sectorLastSeenSpin[sectorName] = -1; // -1 means not seen yet
        }
    }
    // Call this in DOMContentLoaded after WHEEL_NUMBERS is defined
    // initializeSectorStats(); // Will be called after WHEEL_NUMBERS definition


    function calculateWheelDistance(prevNum, currentNum) {
        if (prevNum === null || currentNum === null ||
            !WHEEL_NUMBER_TO_INDEX_MAP.has(prevNum) ||
            !WHEEL_NUMBER_TO_INDEX_MAP.has(currentNum)) {
            return { distance: null, direction: 'N/A' };
        }

        const prevIndex = WHEEL_NUMBER_TO_INDEX_MAP.get(prevNum);
        const currentIndex = WHEEL_NUMBER_TO_INDEX_MAP.get(currentNum);
        const wheelSize = EUROPEAN_WHEEL_ORDER.length;

        let diff = currentIndex - prevIndex;

        // Shortest path
        if (Math.abs(diff) > wheelSize / 2) {
            if (diff > 0) {
                diff = diff - wheelSize; // Go counter-clockwise (negative)
            } else {
                diff = diff + wheelSize; // Go clockwise (positive)
            }
        }

        let direction = '';
        if (diff > 0) direction = 'CW';
        else if (diff < 0) direction = 'CCW';
        else direction = 'Same Number'; // diff is 0

        return {
            distance: Math.abs(diff), // Number of pockets moved
            direction: direction,
            signedDistance: diff // Raw difference, positive for CW, negative for CCW via shortest path
        };
    }

    // Placeholder for the actual DOM element (now using the selected one)
    // let wheelDistanceDisplayDiv = null;

    function updateWheelDistanceDisplay(currentNumber, prevNumber) {
        const displayDiv = wheelDistanceDisplayDiv;
        if (!displayDiv) { console.error("wheelDistanceDisplayDiv not found"); return; }

        let contentDiv = displayDiv.querySelector('.content');
        if (!contentDiv) {
            console.error("Could not find .content div in wheelDistanceDisplay");
            // Optionally create it if critical, or ensure HTML structure is correct
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            displayDiv.appendChild(contentDiv); // Append if H5 is not strictly required for structure here
        }
        contentDiv.innerHTML = ''; // Clear previous content

        if (prevNumber === null || currentNumber === null) {
            contentDiv.innerHTML = '<p>Not enough data (need at least 2 spins).</p>';
            return;
        }

        const result = calculateWheelDistance(prevNumber, currentNumber);
        const p = document.createElement('p');
        if (result.distance === null) {
            p.textContent = "Could not calculate wheel distance (one or both numbers not on wheel?).";
        } else if (result.direction === 'Same Number') {
            p.textContent = `Previous: ${prevNumber}, Current: ${currentNumber} (Same Number).`;
        } else {
            p.textContent = `From ${prevNumber} to ${currentNumber}: ${result.distance} pockets ${result.direction}.`;
        }
        contentDiv.appendChild(p);

        // Future: store result.signedDistance in a history array for pattern analysis.
        // e.g., wheelGapsHistory.push(result.signedDistance);
    }


    function getWheelNeighbors(centerNumber, maxDistance = 2) {
        if (centerNumber === null || centerNumber === undefined || !WHEEL_NUMBER_TO_INDEX_MAP.has(centerNumber)) {
            return {}; // Return empty object or specific structure for no data
        }

        const centerIndex = WHEEL_NUMBER_TO_INDEX_MAP.get(centerNumber);
        const wheelSize = EUROPEAN_WHEEL_ORDER.length;
        const neighbors = {}; // Store as { plus1: num, minus1: num, ... }

        for (let dist = 1; dist <= maxDistance; dist++) {
            // Clockwise neighbor
            const cwIndex = (centerIndex + dist) % wheelSize;
            neighbors[`plus${dist}`] = EUROPEAN_WHEEL_ORDER[cwIndex];

            // Counter-clockwise neighbor
            const ccwIndex = (centerIndex - dist + wheelSize) % wheelSize;
            neighbors[`minus${dist}`] = EUROPEAN_WHEEL_ORDER[ccwIndex];
        }
        return neighbors; // e.g. { plus1: 32, minus1: 26, plus2: 15, minus2: 3 } for center 0
    }

    // Placeholder for the actual DOM element (now using the selected one)
    // let neighborAnalysisDisplayDiv = null;

    function updateNeighborAnalysisDisplay(currentNumber) {
        const displayDiv = neighborAnalysisDisplayDiv; // Use the selected element
        if (!displayDiv) { console.error("neighborAnalysisDisplayDiv not found"); return; }

        let contentDiv = displayDiv.querySelector('.content');
        if (!contentDiv) {
            console.error("Could not find .content div in neighborAnalysisDisplay");
            // Fallback: create and append if missing (HTML should be correct though)
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            displayDiv.appendChild(contentDiv);
        }
        contentDiv.innerHTML = ''; // Clear previous content

        if (currentNumber === null || currentNumber === undefined) {
            contentDiv.innerHTML = '<p>No number selected for neighbor analysis.</p>';
            return;
        }

        const neighbors = getWheelNeighbors(currentNumber, 2); // Get ±1 and ±2 neighbors
        const ul = document.createElement('ul');
        ul.style.listStyleType = 'none'; ul.style.paddingLeft = '0';

        if (Object.keys(neighbors).length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Could not determine neighbors (number not on wheel?).';
            ul.appendChild(li);
        } else {
            const li1 = document.createElement('li');
            li1.innerHTML = `<strong>&pm;1:</strong> ${neighbors.minus1} (CCW), ${neighbors.plus1} (CW)`;
            ul.appendChild(li1);
            const li2 = document.createElement('li');
            li2.innerHTML = `<strong>&pm;2:</strong> ${neighbors.minus2} (CCW), ${neighbors.plus2} (CW)`;
            ul.appendChild(li2);
        }
        contentDiv.appendChild(ul);
    }

    // Placeholder for actual DOM element (now using the selected one)
    // let sectorMovementDisplayDiv = null;

    function updateSectorMovementDisplay(currentNumber, previousNumber, currentSectors) {
        const displayDiv = sectorMovementDisplayDiv;
        if (!displayDiv) { console.error("sectorMovementDisplayDiv not found"); return; }

        let contentDiv = displayDiv.querySelector('.content');
        if (!contentDiv) {
            console.error("Could not find .content div in sectorMovementDisplay");
            contentDiv = document.createElement('div');
            contentDiv.className = 'content';
            displayDiv.appendChild(contentDiv);
        }
        contentDiv.innerHTML = ''; // Clear previous content

        const outputElements = []; // Array of p or ul elements

        if (currentNumber === null && previousNumber === null) {
            const p = document.createElement('p');
            p.textContent = "No data for sector movement analysis.";
            outputElements.push(p);
        } else {
            const pInfo = document.createElement('p');
            pInfo.textContent = `Analysis for latest number: ${currentNumber !== null ? currentNumber : 'N/A'}`;
            outputElements.push(pInfo);

            // CW/CCW Movement
            const pMove = document.createElement('p');
            if (previousNumber !== null && currentNumber !== null) {
                const movement = calculateWheelDistance(previousNumber, currentNumber);
                if (movement.distance !== null && movement.direction !== 'Same Number') {
                    pMove.textContent = `Movement: ${movement.distance} pockets ${movement.direction} (from ${previousNumber} to ${currentNumber}).`;
                } else if (movement.direction === 'Same Number') {
                    pMove.textContent = `Movement: Same number repeated (${currentNumber}).`;
                } else { pMove.textContent = "Movement: Could not calculate."; }
            } else if (currentNumber !== null) {
                pMove.textContent = "Movement: First spin.";
            } else {
                pMove.textContent = "Movement: N/A";
            }
            outputElements.push(pMove);

            // Consecutive Sector Hits
            if (currentConsecutiveSector.name && currentConsecutiveSector.count > 1) {
                const pConsec = document.createElement('p');
                pConsec.innerHTML = `<strong>Streak:</strong> ${currentConsecutiveSector.count} hits in ${currentConsecutiveSector.name}.`;
                outputElements.push(pConsec);
            }

            // Sector Hot Zones
            const pTitle = document.createElement('p');
            pTitle.innerHTML = '<strong>Sector Stats:</strong>';
            outputElements.push(pTitle);
            const ulHot = document.createElement('ul');
            ulHot.style.listStyleType = 'none'; ulHot.style.paddingLeft = '0';

            if(results.length > 0) { // Ensure results exist for currentSpinIndex
                const currentSpinIdx = results.length - 1;
                const sortedSectors = Object.keys(WHEEL_NUMBERS).sort((a,b) => {
                    if (sectorHitCounts[b] !== sectorHitCounts[a]) {
                        return sectorHitCounts[b] - sectorHitCounts[a];
                    }
                    return sectorLastSeenSpin[b] - sectorLastSeenSpin[a];
                });

                sortedSectors.forEach(sectorName => {
                    let recencyText = "never seen";
                    if (sectorLastSeenSpin[sectorName] !== -1) {
                        const spinsAgo = currentSpinIdx - sectorLastSeenSpin[sectorName];
                        recencyText = spinsAgo === 0 && currentSectors && currentSectors.includes(sectorName) ? "this spin" : `${spinsAgo} spin(s) ago`;
                    }
                    const li = document.createElement('li');
                    li.textContent = `${sectorName}: ${sectorHitCounts[sectorName]} hits (Last: ${recencyText})`;
                    ulHot.appendChild(li);
                });
            } else {
                 const li = document.createElement('li');
                 li.textContent = "No results to determine sector stats.";
                 ulHot.appendChild(li);
            }
            outputElements.push(ulHot);
        }
        outputElements.forEach(el => contentDiv.appendChild(el));
    }


    // Advanced Table-Based Groupings Definitions

    // STREETS (Rows of 3)
    const STREETS = {};
    for (let i = 0; i < 12; i++) {
        const startNum = i * 3 + 1;
        STREETS[`Street ${startNum}-${startNum+1}-${startNum+2}`] = [startNum, startNum + 1, startNum + 2];
    }
    // Example: STREETS['Street 1-2-3'] = [1, 2, 3]

    // LINES (Double Rows/Streets - groups of 6)
    const LINES = {};
    for (let i = 0; i < 6; i++) { // Corrected loop to go up to 5 (0 to 5 is 6 lines)
        // Line 1-6, 7-12, ..., 31-36
        // For i=0, startNum = 1. Line 1-6.
        // For i=5, startNum = 5*6+1 = 31. Line 31-36.
        const startNum = i * 6 + 1;
        LINES[`Line ${startNum}-${startNum+5}`] = Array.from({length: 6}, (_, k) => startNum + k);
    }
    // Example: LINES['Line 1-6'] = [1, 2, 3, 4, 5, 6]

    // FINALES (Numbers ending in the same digit)
    const FINALES = {};
    for (let i = 0; i <= 9; i++) {
        FINALES[`Finale ${i}`] = [];
        for (let j = i; j <= 36; j += 10) {
            if (j === 0 && i !== 0) continue; // Only Finale 0 contains 0
            if (j > 0 || (j === 0 && i === 0)) { // Ensure 0 is only in Finale 0
                 FINALES[`Finale ${i}`].push(j);
            }
        }
        if (FINALES[`Finale ${i}`].length === 0) {
            delete FINALES[`Finale ${i}`];
        }
    }
    // Example: FINALES['Finale 7'] = [7, 17, 27]
    // FINALES['Finale 0'] = [0, 10, 20, 30]

    // QUADS/CORNERS - Will be determined programmatically by a helper function
    // No large static structure here, but we can define the function later.
    // For now, just acknowledging this approach.
    // Helper function `getQuadsForNumber(number)` will be created in a subsequent step.
    function getQuadsForNumber(num) {
        if (num === 0 || num > 36) return []; // 0 and invalid numbers are not in corners

        const quads = [];
        const col = (num - 1) % 3; // 0 for col 1, 1 for col 2, 2 for col 3
        const row = Math.floor((num - 1) / 3); // 0 for row 1 (1-3), 11 for row 12 (34-36)

        // Check if it can be the bottom-right number of a corner
        // (i.e., corner is num-4, num-3, num-1, num) - corrected indices based on standard table layout.
        // A corner involves num and its three adjacent numbers.
        // Example for num=5:
        // Corner 1 (top-left for 5): 5, 6, 2, 3 -> (num, num+1, num-3, num-3+1)
        // Corner 2 (top-right for 5): 4, 5, 1, 2 -> (num-1, num, num-3-1, num-3)
        // Corner 3 (bottom-left for 5): 8, 9, 5, 6 -> (num+3, num+3+1, num, num+1)
        // Corner 4 (bottom-right for 5): 7, 8, 4, 5 -> (num+3-1, num+3, num-1, num)

        // Top-left of a potential square (num is the top-left)
        if (col < 2 && row < 11) { // Can form a square with num+1, num+3, num+4
            quads.push(`Quad: ${num}, ${num+1}, ${num+3}, ${num+4}`);
        }
        // Top-right of a potential square (num is the top-right)
        if (col > 0 && row < 11) { // Can form a square with num-1, num, num+2, num+3
            quads.push(`Quad: ${num-1}, ${num}, ${num+2}, ${num+3}`);
        }
        // Bottom-left of a potential square (num is the bottom-left)
        if (col < 2 && row > 0) { // Can form a square with num-3, num-2, num, num+1
            quads.push(`Quad: ${num-3}, ${num-2}, ${num}, ${num+1}`);
        }
        // Bottom-right of a potential square (num is the bottom-right)
        if (col > 0 && row > 0) { // Can form a square with num-4, num-3, num-1, num
            quads.push(`Quad: ${num-4}, ${num-3}, ${num-1}, ${num}`);
        }
        return quads.sort(); // Sort for consistent display if multiple quads found
    }


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
    initializeAppearanceIndexes();
    initializeSectorStats(); // Add this call

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
        updateTableGroupAnalysis(number);
        updateNeighborAnalysisDisplay(number);

        let belongingSectorsForCurrent = [];
        for (const groupName in WHEEL_NUMBERS) {
            if (WHEEL_NUMBERS[groupName].includes(number)) {
                belongingSectorsForCurrent.push(groupName);
            }
        }

        belongingSectorsForCurrent.forEach(sectorName => {
            sectorHitCounts[sectorName]++;
            sectorLastSeenSpin[sectorName] = results.length - 1;
        });

        // Update Consecutive Sector Hits (refined logic)
        let streakContinued = false;
        if (currentConsecutiveSector.name && belongingSectorsForCurrent.includes(currentConsecutiveSector.name)) {
            currentConsecutiveSector.count++;
            streakContinued = true;
        }

        if (!streakContinued) { // Streak broken or first hit
            if (belongingSectorsForCurrent.length > 0) {
                // Start new streak with the first sector found for the current number
                // (Could be refined if a number is in multiple, e.g. prefer Voisins over Zero Spiel if both match)
                currentConsecutiveSector.name = belongingSectorsForCurrent[0];
                currentConsecutiveSector.count = 1;
            } else { // No sector for current number, so streak ends, no new one starts
                currentConsecutiveSector.name = null;
                currentConsecutiveSector.count = 0;
            }
        }

        const prevNumber = results.length >= 2 ? results[results.length - 2] : null;
        updateWheelDistanceDisplay(number, prevNumber);
        updateSectorMovementDisplay(number, prevNumber, belongingSectorsForCurrent); // New call

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
            initializeAppearanceIndexes();
            initializeSectorStats(); // Reset stats

            renderResults();
            clearAnalysis(); // Clears wheel group analysis

            // Update all statistical displays to show empty/initial state
            updateHitFrequencyDisplay();
            updateHotColdAnalysis();
            updateLastSeenDisplay();
            updateRepeatersAnalysis();
            updateSleepersAnalysis();
            updateDistanceAnalysis();
            updateTableGroupAnalysis(null);
            updateNeighborAnalysisDisplay(null);
            updateWheelDistanceDisplay(null, null);
            updateSectorMovementDisplay(null, null, []); // New call

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
        initializeAppearanceIndexes();
        initializeSectorStats(); // Reset before recalculating

        if (storedResults) {
            results = JSON.parse(storedResults);

            results.forEach(num => {
                if (numberCounts[num] !== undefined) numberCounts[num]++;
            });

            results.forEach((num, index) => {
                lastSeenAtSpin[num] = index;
            });

            results.forEach((num, index) => {
                appearanceIndexes[num].push(index);
            });

            // Recalculate sector stats based on loaded results
            results.forEach((num, index) => {
                let belongingSectors = [];
                for (const groupName in WHEEL_NUMBERS) {
                    if (WHEEL_NUMBERS[groupName].includes(num)) {
                        belongingSectors.push(groupName);
                    }
                }
                belongingSectors.forEach(sectorName => {
                    sectorHitCounts[sectorName]++;
                    sectorLastSeenSpin[sectorName] = index;
                });

                // Update consecutive streak based on this num and previous one in results (refined logic)
                let streakContinued = false;
                if (currentConsecutiveSector.name && belongingSectors.includes(currentConsecutiveSector.name)) {
                    currentConsecutiveSector.count++;
                    streakContinued = true;
                }

                if (!streakContinued) {
                    if (belongingSectors.length > 0) {
                        currentConsecutiveSector.name = belongingSectors[0];
                        currentConsecutiveSector.count = 1;
                    } else {
                        currentConsecutiveSector.name = null;
                        currentConsecutiveSector.count = 0;
                    }
                }
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

        const lastNum = results.length > 0 ? results[results.length - 1] : null;
        const secondLastNum = results.length >= 2 ? results[results.length - 2] : null;
        let lastNumSectors = [];
        if (lastNum !== null) {
            for (const groupName in WHEEL_NUMBERS) {
                if (WHEEL_NUMBERS[groupName].includes(lastNum)) {
                    lastNumSectors.push(groupName);
                }
            }
        }

        if (results.length > 0) {
            updateTableGroupAnalysis(lastNum);
            updateNeighborAnalysisDisplay(lastNum);
        } else {
            updateTableGroupAnalysis(null);
            updateNeighborAnalysisDisplay(null);
        }
        if (results.length >= 2) {
            updateWheelDistanceDisplay(lastNum, secondLastNum);
        } else {
            updateWheelDistanceDisplay(null, null);
        }
        updateSectorMovementDisplay(lastNum, secondLastNum, lastNumSectors); // New call
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
        if (currentNumber > 0) {
            for (const dozenName in DOZENS) {
                if (currentNumber >= DOZENS[dozenName].min && currentNumber <= DOZENS[dozenName].max) {
                    dozenText = dozenName;
                    break;
                }
            }
        }
        const dozLi = document.createElement('li');
        dozLi.textContent = `Dozen: ${dozenText}`;
        posList.appendChild(dozLi);

        // Column
        let columnText = 'N/A (0)';
        if (currentNumber > 0) {
            for (const colName in COLUMNS) {
                if (COLUMNS[colName].includes(currentNumber)) {
                    columnText = colName;
                    break;
                }
            }
        }
        const colLi = document.createElement('li');
        colLi.textContent = `Column: ${columnText}`;
        posList.appendChild(colLi);
        positionalContent.appendChild(posList);

        // --- Advanced Table Properties ---
        let advancedContent = advancedTablePropsDiv.querySelector('.content');
        if (!advancedContent) {
            advancedContent = document.createElement('div');
            advancedContent.className = 'content';
            const h4 = advancedTablePropsDiv.querySelector('h4');
            if (h4 && h4.nextSibling) advancedTablePropsDiv.insertBefore(advancedContent, h4.nextSibling);
            else if (h4) advancedTablePropsDiv.appendChild(advancedContent);
            else advancedTablePropsDiv.appendChild(advancedContent); // Fallback
        }
        advancedContent.innerHTML = ''; // Clear previous

        if (currentNumber === null) {
            advancedContent.textContent = 'No number selected for analysis.';
        } else {
            const advList = document.createElement('ul');
            advList.style.paddingLeft = '0'; advList.style.listStyleType = 'none';

            // Street
            let streetText = 'N/A (0 or not applicable)';
            if (currentNumber > 0) {
                for (const streetName in STREETS) {
                    if (STREETS[streetName].includes(currentNumber)) {
                        streetText = streetName;
                        break;
                    }
                }
            }
            const streetLi = document.createElement('li');
            streetLi.textContent = `Street: ${streetText}`;
            advList.appendChild(streetLi);

            // Line
            let lineText = 'N/A (0 or not applicable)';
            if (currentNumber > 0) {
                for (const lineName in LINES) {
                    if (LINES[lineName].includes(currentNumber)) {
                        lineText = lineName;
                        break;
                    }
                }
            }
            const lineLi = document.createElement('li');
            lineLi.textContent = `Line: ${lineText}`;
            advList.appendChild(lineLi);

            // Quads/Corners
            const quadsLi = document.createElement('li');
            if (currentNumber > 0) {
                const quads = getQuadsForNumber(currentNumber);
                quadsLi.textContent = `Corners: ${quads.length > 0 ? quads.join(', ') : 'None'}`;
            } else {
                quadsLi.textContent = 'Corners: N/A (0)';
            }
            advList.appendChild(quadsLi);

            // Finales
            let finaleText = 'N/A (Special case or 0)';
            let foundFinale = false;
            // Finale 0 is the only one that can contain 0
            if (FINALES[`Finale ${currentNumber % 10}`] && FINALES[`Finale ${currentNumber % 10}`].includes(currentNumber)) {
                 finaleText = `Finale ${currentNumber % 10}`;
                 foundFinale = true;
            } else if (currentNumber === 0 && FINALES['Finale 0'] && FINALES['Finale 0'].includes(0)) {
                // Explicit check for 0 if the modulo logic isn't direct for it
                finaleText = 'Finale 0';
                foundFinale = true;
            }


            if (!foundFinale && currentNumber !== null && currentNumber !== undefined) {
                finaleText = 'None';
            } else if (currentNumber === null || currentNumber === undefined){
                finaleText = 'No number selected';
            }

            const finaleLi = document.createElement('li');
            finaleLi.textContent = `Finale: ${finaleText}`;
            advList.appendChild(finaleLi);

            advancedContent.appendChild(advList);
        }
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
        latestNumberAnalysisDiv.innerHTML = ''; // Clear previous text analysis

        const analysisText = document.createElement('p');
        analysisText.innerHTML = `Analysis for <strong>${number}</strong> (Wheel Sectors):`;
        latestNumberAnalysisDiv.appendChild(analysisText);

        let belongingSectors = []; // Store sectors the number belongs to

        for (const groupName in WHEEL_NUMBERS) {
            if (WHEEL_NUMBERS[groupName].includes(number)) {
                const groupP = document.createElement('p');
                groupP.textContent = `Belongs to: ${groupName}`;
                latestNumberAnalysisDiv.appendChild(groupP);
                belongingSectors.push(groupName); // Add to our list for SVG highlighting
            }
        }
        if (belongingSectors.length === 0 && (number !== null && number !== undefined) ) {
             const noGroupP = document.createElement('p');
             noGroupP.textContent = 'Not part of any major predefined wheel-based group.';
             latestNumberAnalysisDiv.appendChild(noGroupP);
        } else if (number === null || number === undefined) {
            latestNumberAnalysisDiv.innerHTML = '<p>No number selected for wheel sector analysis.</p>';
        }


        // --- SVG Highlighting Logic ---
        if (rouletteWheelSvgContainer) {
            // 1. Reset previously highlighted elements
            const highlightedElements = rouletteWheelSvgContainer.querySelectorAll('.highlighted-svg-number');
            highlightedElements.forEach(el => {
                el.classList.remove('highlighted-svg-number');
                // el.style.fill = ''; // Or reset style directly if not using classes
            });

            // 2. Highlight numbers in the identified sectors
            if (belongingSectors.length > 0) {
                belongingSectors.forEach(sectorName => {
                    const numbersInSector = WHEEL_NUMBERS[sectorName];
                    if (numbersInSector) {
                        numbersInSector.forEach(numInSector => {
                            // Attempt to find element by expected ID, e.g., "svg-num-15"
                            const svgElement = rouletteWheelSvgContainer.querySelector(`#svg-num-${numInSector}`);
                            if (svgElement) {
                                svgElement.classList.add('highlighted-svg-number');
                                // svgElement.style.fill = 'orange'; // Or set style directly
                            }
                        });
                    }
                });
            } else if (number !== null && number !== undefined) {
                // If the number itself is not in a major sector, but we want to highlight just that number
                const svgSingleElement = rouletteWheelSvgContainer.querySelector(`#svg-num-${number}`);
                if (svgSingleElement) {
                    svgSingleElement.classList.add('highlighted-svg-number');
                }
            }
        }
        // --- End of SVG Highlighting Logic ---
    }

    function clearAnalysis() {
        latestNumberAnalysisDiv.innerHTML = ''; // Clears text analysis

        // Clear SVG highlights as well
        if (rouletteWheelSvgContainer) {
            const highlightedElements = rouletteWheelSvgContainer.querySelectorAll('.highlighted-svg-number');
            highlightedElements.forEach(el => {
                el.classList.remove('highlighted-svg-number');
                // el.style.fill = ''; // Reset style if not using classes
            });
        }
    }

    // Initial calls on page load:
    loadResults(); // This will also call updateHitFrequencyDisplay
});
