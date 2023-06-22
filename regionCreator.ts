class RegionCreator {

    public doLog: boolean = true;
    public maxOneTime: number = 1;
    public maxTime: number = 10;
    public maxTries: number = 100;

    private readonly masterWidth: number | null = null;
    private readonly givenPairs: [number, number][] | null = null;
    private readonly originalCellIds: number[]; // id encoding
    private cellCount: number;

    // each cell is numbered from 0 to size-1
    private baseNeighbors: number[][];  // at nth position are the nth cell's neighbors
    private baseFieldForCell: number[];  // at nth position is the field number the cell n is in
    private baseCellsForFields: number[][];  // at kth position are stored the cells' numbers that are in the kth field
    private _hasBoard: boolean = false;
    public get hasBoard(): boolean {
        return this._hasBoard;
    }
    private _board: number[] = [];
    public get board(): number[] {
        return RegionCreatorUtils.arrayDeepcopy(this._board);
    }
    private _regions: number[][] = [];
    public get regions(): number[][] {
        return RegionCreatorUtils.arrayDeepcopy(this._regions);
    }

    // region sizes and shapes
    private _forcedRegionSizes: number[] = [];  // region sizes that must be present
    public set forcedRegionSizes(sizes: number[] | null) {
        this._forcedRegionSizes = sizes === null ? [] : RegionCreatorUtils.arrayDeepcopy(sizes);
    }
    private baseRegionSizes: number[] = [1];
    private baseRegionCount: number = 1;
    private _spaghetti: boolean = false;  // true if we want to maximize the circumference/spreading of a region
    public set spaghetti(value: boolean) { this._spaghetti = value; }
    public get spaghetti(): boolean { return this._spaghetti; }

    // region conditions
    private strictness: number = 0;  // how much do the random sizes not deviate from width and/or height - 0(max) to 1(min deviation)
    private smallerRegionChance: number = 0.5;  // desired percentage of regionCreator smaller than the avgRegionSize, must be between 0 and 1
    private includeAvgRegionSize: boolean = true;  // if false, then avgRegionSize must not be equal to min and max RegionSize
    private avgRegionSize: number = 1;  // must be integer between 1 and (cellCount - sum of baseRegionSizes) (including) and must be between min and max RegionSize
    private minRegionSize: number = 1;  // must be integer between 1 and (cellCount - sum of baseRegionSizes) (including) and must be smaller or equal to maxRegionSize
    private maxRegionSize: number = 1;  // must be integer between 1 and (cellCount - sum of baseRegionSizes) (including) and must be bigger or equal to minRegionSize

    private then: number = new Date().getTime();
    private thenOne: number = new Date().getTime();
    // variables to help with the generation
    private regionSizes: number[] = [];
    private regionCount: number = 1;
    private freeNeighbors: number[][] = [[]];
    private regionForCell: number[] = [];
    private fieldForCell: number[] = [];
    private cellsForFields: number[][] = [[]];
    private neighboringCells: number[] = [];
    private neighboringFields: number[] = [];
    private neighborsToExclude: number[] = [];  // save neighbor cells which weren't possible for parenthetical cells bcs they aren't possible even for the children's

    // input - the numbers in neighborPairs must be given in the range of originalCellIds or cellCount, otherwise they won't be taken in account
    //         cellCount: number (starting from 0), masterWidth: number ||
    //         originalCellIds: number[], masterWidth: number ||
    //         originalCellIds: number[], neighborPairs: [number, number][]
    //         cellCount: number (starting from 0), neighborPairs: [number, number][]
    constructor(cellIdentifier: number[] | number, pairIdentifier: number | [number, number][]) {
        if (typeof cellIdentifier === "number") {
            if (cellIdentifier < 1) {
                throw "OutOfRangeValue: cellIdentifier - cellCount can't be of a value smaller than 1";
            }
            this.originalCellIds = RegionCreatorUtils.createArrayIncremented(0, cellIdentifier);
            this.cellCount = this.originalCellIds.length;
        } else {
            this.originalCellIds = RegionCreatorUtils.arrayDeepcopy(cellIdentifier).sort((a: number, b: number) => { return a - b; });
            this.cellCount = this.originalCellIds.length;
        }
        if (typeof pairIdentifier === "number") {
            if (pairIdentifier < 1) {
                throw "OutOfRangeValue: pairIdentifier - masterWidth can't be of a value smaller than 1";
            }
            this.masterWidth = pairIdentifier;
        } else {
            this.givenPairs = RegionCreatorUtils.arrayDeepcopy(pairIdentifier);
        }

        if (this.masterWidth !== null) {
            this.baseNeighbors = RegionCreator.getBaseNeighborsByWidth(this.originalCellIds, this.masterWidth);
        } else {
            this.baseNeighbors = RegionCreator.getBaseNeighborsByPairs(this.originalCellIds, this.givenPairs!);
        }

        [this.baseFieldForCell, this.baseCellsForFields] = RegionCreator.getBaseFields(this.baseNeighbors);
    }

    private static getBaseFields(baseNeighbors: number[][]): [number[], number[][]] {
        let cellCount = baseNeighbors.length;
        let leftCells = RegionCreatorUtils.createArrayIncremented(0, cellCount);

        let baseFieldForCell = RegionCreatorUtils.createArray1d(cellCount, -1);
        let baseCellsForFields = [];

        let nextField: number[];
        let cellsToCheck: number[];
        let cellId: number;
        let neighborId: number;
        while (leftCells.length > 0) {
            nextField = [];
            cellsToCheck = [leftCells.pop()!];
            while (cellsToCheck.length > 0) {
                cellId = cellsToCheck.pop()!;
                leftCells = RegionCreatorUtils.arrayRemoveOne(leftCells, cellId);
                nextField.push(cellId);
                for (let i = 0; i < baseNeighbors[cellId].length; i++) {
                    neighborId = baseNeighbors[cellId][i];
                    if (nextField.indexOf(neighborId) === -1 && cellsToCheck.indexOf(neighborId) === -1) {
                        cellsToCheck.push(neighborId);
                    }
                }
            }

            for (let i = 0; i < nextField.length; i++) {
                baseFieldForCell[nextField[i]] = baseCellsForFields.length;
            }
            baseCellsForFields.push(nextField);
        }

        return [baseFieldForCell, baseCellsForFields];
    }

    private static getBaseNeighborsByPairs(originalCellIds: number[], pairs: [number, number][]): number[][] {
        let neighbors: number[][] = [];
        for (let i = 0; i < originalCellIds.length; i++) {
            neighbors.push([]);
        }

        for (let i = 0; i < pairs.length; i++) {
            let newIdFirst = originalCellIds.indexOf(pairs[i][0]);
            let newIdSecond = originalCellIds.indexOf(pairs[i][1]);
            if (newIdFirst === -1 || newIdSecond === -1 || newIdFirst === newIdSecond) {
                continue;
            }

            if (neighbors[newIdFirst].indexOf(newIdSecond) === -1) {
                neighbors[newIdFirst].push(newIdSecond);
                neighbors[newIdSecond].push(newIdFirst);
            }
        }

        return neighbors;
    }

    private static getBaseNeighborsByWidth(originalCellIds: number[], masterWidth: number): number[][] {
        // originalCellIds must be sorted and there must be no duplicates
        let spacings = [1, masterWidth]; // right, down
        let neighbors: number[][] = [];
        for (let i = 0; i < originalCellIds.length; i++) {
            neighbors.push([]);
        }

        for (let i = 0; i < originalCellIds.length; i++) {
            let originalIndex = originalCellIds[i];
            for (let j = 0; j < 2; j++) { // for each half-direction
                if (j === 0 && (originalIndex % masterWidth === masterWidth - 1 || originalIndex % masterWidth === -1)) {
                    continue;
                }
                for (let k = i + 1; k <= i + spacings[j]; k++) {
                    if (k < 0 || k > originalCellIds.length) {
                        break;
                    }
                    if (originalCellIds[k] - originalCellIds[i] === spacings[j]) {
                        neighbors[i].push(k);
                        neighbors[k].push(i);
                        break;
                    }
                }
            }
        }
        return neighbors;
    }

    // REGION SIZES AND SHAPES

    public setRegionConditions(
        strictness: number|null = null,
        smallerRegionChance: number|null = null,
        includeAvgRegionSize: boolean|null = null,
        avgRegionSize: number|null = null,
        minRegionSize: number|null = null,
        maxRegionSize: number|null = null
    ): void {
        this.strictness = strictness === null ? 0 : strictness;
        this.smallerRegionChance = smallerRegionChance === null ? 0.2 : smallerRegionChance;
        this.includeAvgRegionSize = includeAvgRegionSize === null ? true : includeAvgRegionSize;
        this.avgRegionSize = avgRegionSize === null ? Math.floor((this.cellCount)**(1/2)) : avgRegionSize;
        this.minRegionSize = avgRegionSize === null ? 1 : avgRegionSize;  // if minRS is null, then if avgRS is set, it is the same
        this.minRegionSize = minRegionSize === null ? this.minRegionSize : minRegionSize;
        this.maxRegionSize = avgRegionSize === null ? this.cellCount : avgRegionSize;  // if maxRS is null, then if avgRS is set, it is the same
        this.maxRegionSize = maxRegionSize === null ? this.maxRegionSize : maxRegionSize;
        if (this.strictness < 0) {
            this.strictness = 0;
        } else if (this.strictness > 1) {
            this.strictness = 1;
        }
        if (this.minRegionSize < 1) {
            this.minRegionSize = 1;
        } else if (this.minRegionSize > this.cellCount) {
            this.minRegionSize = this.cellCount;
        }
        if (this.maxRegionSize < this.minRegionSize) {
            this.maxRegionSize = this.minRegionSize;
        } else if (this.maxRegionSize > this.cellCount) {
            this.maxRegionSize = this.cellCount;
        }
        if (this.avgRegionSize < this.minRegionSize || this.avgRegionSize > this.maxRegionSize) {
            this.avgRegionSize = Math.floor((this.minRegionSize + this.maxRegionSize)/2);
        }
        if ( !this.includeAvgRegionSize && (this.minRegionSize === this.avgRegionSize || this.maxRegionSize === this.avgRegionSize)) {
            throw "UnexpectedValue: If you don't want to include avgRegionSize, you can't have the minRegionSize or the maxRegionSize equal its value.";
        }
        return;
    }

    private setBaseRegionSizes(): void {
        let tryAgain = true;
        while (tryAgain) {
            tryAgain = false;
            this.baseRegionSizes = RegionCreatorUtils.arrayDeepcopy(this._forcedRegionSizes);
            let sizeLeft = this.cellCount - RegionCreatorUtils.arrayGetSum(this.baseRegionSizes);
            while (sizeLeft > 0 && !tryAgain) {
                let isSmaller = Math.random() < this.smallerRegionChance;
                let leeway = isSmaller ? this.avgRegionSize - this.minRegionSize + 1 : this.maxRegionSize - this.avgRegionSize + 1;
                if (!this.includeAvgRegionSize) {
                    leeway -= 1;
                }
                let relativeDeviation = Math.random();
                if (this.strictness < 1) {
                    relativeDeviation **= 1 / (1 - this.strictness);
                } else {
                    relativeDeviation = 0;
                }
                let deviation = Math.floor(relativeDeviation * leeway);
                if (!this.includeAvgRegionSize) {
                    deviation += 1;
                }
                deviation = isSmaller ? -1 * deviation : deviation;
                let newSize = this.avgRegionSize + deviation;
                if (newSize > sizeLeft) {  // make a better way to deal with it, bcs then a region of not very possible sizes bcs of strictness
                    newSize = sizeLeft;
                    if (newSize < this.minRegionSize || (newSize === this.avgRegionSize && !this.includeAvgRegionSize)) {
                        tryAgain = true;
                    }
                } else if (sizeLeft - newSize < this.minRegionSize && sizeLeft < this.maxRegionSize) {
                    newSize = sizeLeft;
                }
                sizeLeft -= newSize;
                this.baseRegionSizes.push(newSize);
            }
        }
        return;
    }

    public createNewRegionSizes(): void {
        this.setBaseRegionSizes();
        this.baseRegionSizes = this.baseRegionSizes.sort((a: number, b: number) => { return a - b; });
        this.baseRegionCount = this.baseRegionSizes.length;
        if (this.doLog) {
            console.log("RegionCreator - generated region sizes:", this.baseRegionSizes);
        }
        return;
    }

    // CREATE NEW BOARD

    public createNewBoard(): void {
        this.then = new Date().getTime();
        let tries = 0;

        this._board = RegionCreatorUtils.createArray1d(this.cellCount, -1);
        this._hasBoard = false;
        while ( !this._hasBoard) {
            // console.log("NEW BOARD");
            this.thenOne = new Date().getTime();
            this.copyBaseValues();
            this.placeNextRegion();
            // this.print();

            let now = new Date().getTime();
            if (((now - this.then) / 1000) >= this.maxTime) {
                break;
            }
            tries += 1;
            if (tries >= this.maxTries) {
                break;
            }
        }
        this._board = RegionCreatorUtils.arrayDeepcopy(this.regionForCell);
        this._regions = this.getRegionsFromBoard();

        if (this.doLog) {
            let now = new Date().getTime();
            console.log(`RegionCreator - ${(now - this.then) / 1000}s, ${tries} tries`);
        }
        return;
    }

    private copyBaseValues(): void {
        this.regionSizes = RegionCreatorUtils.arrayDeepcopy(this.baseRegionSizes);
        this.regionCount = this.baseRegionCount;
        this.freeNeighbors = RegionCreatorUtils.arrayDeepcopy(this.baseNeighbors);
        this.regionForCell = RegionCreatorUtils.createArray1d(this.cellCount, -1);
        this.fieldForCell = RegionCreatorUtils.arrayDeepcopy(this.baseFieldForCell);
        this.cellsForFields = RegionCreatorUtils.arrayDeepcopy(this.baseCellsForFields);
    }

    private getRegionsFromBoard(): number[][] {
        let regions = [];
        for (let i = 0; i < this.regionCount; i++) {
            let region = [];
            for (let j = 0; j < this._board.length; j++) {
                if (this._board[j] === i) {
                    region.push(this.originalCellIds[j]);
                }
            }
            regions.push(region);
        }
        return regions;
    }

    // PLACE NEXT REGION

    private placeNextRegion(): void {

        // console.log("NEXT region DOWN");
        // console.log("region num", this.regionSizes.length);
        // console.log(this.regionSizes[this.regionSizes.length - 1]);
        // this.print();

        if (this.regionSizes.length === 0) {
            this._hasBoard = true;
            return;
        }

        let currRegionSize = this.regionSizes.pop();
        let currRegionId = this.regionCount - this.regionSizes.length - 1;
        this.neighboringFields = [];
        this.neighboringCells = [];
        this.neighborsToExclude = [];

        // @ts-ignore
        let cellsPlaced = this.tryPlaceNextCell(currRegionSize, currRegionId, currRegionSize);
        // console.log("VALIDITY", cellsPlaced);
        if (cellsPlaced) {
            this.placeNextRegion();
        }
        // console.log("UP UP UP UP");
        // console.log("UP UP UP UP");
        // console.log("UP UP UP UP");
        // console.log("UP UP UP UP");
        // console.log("UP UP UP UP");
        return;
    }

    // PLACE NEXT CELL

    private tryPlaceNextCell(regionSize: number, regionId: number, cellsLeftToPlace: number): boolean {
        // console.log(regionSize - cellsLeftToPlace);

        if (cellsLeftToPlace === 0) {
            return true;
        }

        let now = new Date().getTime();
        if ((now - this.thenOne) / 1000 >= this.maxOneTime || (now - this.then) / 1000 >= this.maxTime) {
            return false;
        }

        let starterCells = this.getStarterCells(regionSize, regionId, cellsLeftToPlace);
        let neighborsExcluded = 0;

        for (let i = 0; i < starterCells.length; i++) {
            let cellId = starterCells[i];
            // console.log("TRYING", cellId);

            // place the cell
            let prevFieldId = this.placeCell(regionId, cellId);
            // add appropriate new neighbors
            let addedNeighbors = this.addNewNeighbors(regionSize, cellsLeftToPlace, prevFieldId, cellId);
            // separate fields that got divided
            let addedFields = this.separateFields(prevFieldId, cellId);

            // check packability
            let isPackable = this.checkPackability(regionSize, cellsLeftToPlace);
            // console.log("isPackable", isPackable);
            // place next cell
            if (isPackable) {
                cellsLeftToPlace -= 1;
                // console.log("PLACED", cellId);
                let isPlaceable = this.tryPlaceNextCell(regionSize, regionId, cellsLeftToPlace);
                // console.log("previously placed", cellId);
                // console.log("isPlaceable", isPlaceable);
                cellsLeftToPlace += 1;
                if (isPlaceable) {
                    return true;
                }
            }

            this.neighborsToExclude.push(cellId);
            neighborsExcluded += 1;
            // undo fields
            this.undoSeparateFields(addedFields, prevFieldId);
            // undo neighbors
            this.undoAddNewNeighbors(regionSize, cellsLeftToPlace, cellId, addedNeighbors, prevFieldId);
            // undo cell
            this.undoPlaceCell(cellId, prevFieldId);
        }
        this.neighborsToExclude = this.neighborsToExclude.slice(0, neighborsExcluded * -1);

        return false;
    }

    private getStarterCells(regionSize: number, regionId: number, cellsLeftToPlace: number): number[] {
        let starterCells = [];
        if (regionSize === cellsLeftToPlace) { // if this is the first cell, set an array of all possible first placements (from fields that are equal or bigger size)
            for (let i = 0; i < this.cellsForFields.length; i++) {
                let fieldSize = this.cellsForFields[i].length;
                if (fieldSize >= regionSize) {
                    for (let j = 0; j < fieldSize; j++) {
                        starterCells.push(this.cellsForFields[i][j]);
                    }
                }
            }
        } else {
            starterCells = [];
            for (let i = 0; i < this.neighboringCells.length; i++) {
                if (this.neighborsToExclude.indexOf(this.neighboringCells[i]) === -1) {
                    starterCells.push(this.neighboringCells[i]);
                }
            }
        }
        if (this._spaghetti) {
            let neighborCountForCell: number[][];  // how many neighbors of a starterCell are in the current field
            neighborCountForCell = [[], [], [], [], []];
            for (let i = 0; i < starterCells.length; i++) {
                let cellId = starterCells[i];
                let neighborCount = 0;
                for (let j = 0; j < this.baseNeighbors[cellId].length; j++) {
                    let neighborId = this.baseNeighbors[cellId][j];
                    if (this.regionForCell[neighborId] === regionId) {
                        neighborCount += 1;
                    }
                }
                neighborCountForCell[neighborCount].push(cellId);
            }
            starterCells = [];
            for (let i = 0; i < neighborCountForCell.length; i++) {
                RegionCreatorUtils.arrayShuffle(neighborCountForCell[i]);
                for (let j = 0; j < neighborCountForCell[i].length; j++) {
                    starterCells.push(neighborCountForCell[i][j]);
                }
            }
        } else {
            RegionCreatorUtils.arrayShuffle(starterCells);
        }
        return starterCells;
    }

    private placeCell(regionId: number, cellId: number): number {
        this.regionForCell[cellId] = regionId;
        let prevFieldId = this.fieldForCell[cellId];
        this.fieldForCell[cellId] = -1;
        let cellNeighbors = this.freeNeighbors[cellId];
        for (let i = 0; i < cellNeighbors.length; i++) {
            this.freeNeighbors[cellNeighbors[i]] = RegionCreatorUtils.arrayRemoveOne(this.freeNeighbors[cellNeighbors[i]], cellId);
        }
        this.cellsForFields[prevFieldId] = RegionCreatorUtils.arrayRemoveOne(this.cellsForFields[prevFieldId], cellId);
        return prevFieldId;
    }

    private addNewNeighbors(regionSize: number, cellsLeftToPlace: number, prevFieldId: number, cellId: number): number[] {
        if (regionSize !== cellsLeftToPlace) {
            this.neighboringCells = RegionCreatorUtils.arrayRemoveOne(this.neighboringCells, cellId);
        } else {
            this.neighboringFields.push(prevFieldId)
        }
        let addedNeighbors = [];
        let cellNeighbors = this.freeNeighbors[cellId];
        for (let i = 0; i < cellNeighbors.length; i++) {
            let cellNeighbor = cellNeighbors[i];
            if (this.neighboringCells.indexOf(cellNeighbor) === -1) {
                addedNeighbors.push(cellNeighbor);
                this.neighboringCells.push(cellNeighbor);
            }
        }
        return addedNeighbors;
    }

    private separateFields(prevFieldId: number, cellId: number): number[] {
        let addedFields: number[];
        addedFields = [];
        if (this.freeNeighbors[cellId].length > 1) {
            let neighborsForFields = this.getFieldsForCells(cellId);
            if (neighborsForFields.length > 1) {
                for (let i = 1; i < neighborsForFields.length; i++) {
                    let fieldId = this.cellsForFields.length;
                    addedFields.push(fieldId);
                    this.neighboringFields.push(fieldId);
                    let addedFieldCells: number[];
                    addedFieldCells = [];
                    let neighborsForField = neighborsForFields[i];
                    for (let j = 0; j < neighborsForField.length; j++) {
                        let neighbor = neighborsForField[j];
                        this.fieldForCell[neighbor] = fieldId;
                        this.cellsForFields[prevFieldId] = RegionCreatorUtils.arrayRemoveOne(this.cellsForFields[prevFieldId], neighbor);
                        addedFieldCells.push(neighbor);
                    }
                    this.cellsForFields.push(addedFieldCells);
                }
            }
        }

        return addedFields;
    }

    private getFieldsForCells(cellId: number): number[][] {
        let toCheck = RegionCreatorUtils.arrayDeepcopy(this.freeNeighbors[cellId]);
        let fields: number[][];
        fields = [];
        let currField: number[];
        currField = [];
        let neighborsInCurrentField = [];
        neighborsInCurrentField.push(toCheck[0]);
        let doContinue = true;
        let freeNeighbor: number;
        let neighborToCheck: number;
        while (doContinue) {
            if (neighborsInCurrentField.length === 0) {
                fields.push(currField);
                if (toCheck.length === 0) {
                    doContinue = false;
                    continue;
                }
                currField = [];
                neighborsInCurrentField.push(toCheck[0]);
            }
            neighborToCheck = neighborsInCurrentField[0];
            for (let i = 0; i < this.freeNeighbors[neighborToCheck].length; i++) {
                freeNeighbor = this.freeNeighbors[neighborToCheck][i];
                if (neighborsInCurrentField.indexOf(freeNeighbor) === -1 && currField.indexOf(freeNeighbor) === -1) {
                    neighborsInCurrentField.push(freeNeighbor);
                }
            }
            if (toCheck.indexOf(neighborToCheck) >= 0) {
                toCheck = RegionCreatorUtils.arrayRemoveOne(toCheck, neighborToCheck);
            }
            currField.push(neighborToCheck);
            neighborsInCurrentField.shift();
        }
        return fields;
    }

    private undoSeparateFields(addedFields: number[], prevFieldId: number): void {
        for (let i = 0; i < addedFields.length; i++) {
            let fieldId = addedFields[i];
            this.neighboringFields = RegionCreatorUtils.arrayRemoveOne(this.neighboringFields, fieldId);
            for (let j = 0; j < this.cellsForFields[fieldId].length; j++) {
                let cellId = this.cellsForFields[fieldId][j];
                this.fieldForCell[cellId] = prevFieldId;
                this.cellsForFields[prevFieldId].push(cellId);
            }
        }
        for (let i = 0; i < addedFields.length; i++) {
            this.cellsForFields.pop();
        }
        return;
    }

    private undoAddNewNeighbors(regionSize: number, cellsLeftToPlace: number, cellId: number, addedNeighbors: number[], prevFieldId: number): void {
        if (regionSize !== cellsLeftToPlace) {
            this.neighboringCells.push(cellId);
        }
        for (let i = 0; i < addedNeighbors.length; i++) {
            this.neighboringCells = RegionCreatorUtils.arrayRemoveOne(this.neighboringCells, addedNeighbors[i]);
        }
        if (regionSize === cellsLeftToPlace) {
            this.neighboringFields = RegionCreatorUtils.arrayRemoveOne(this.neighboringFields, prevFieldId);
        }
        return;
    }

    private undoPlaceCell(cellId: number, prevFieldId: number): void {
        this.regionForCell[cellId] = -1;
        this.fieldForCell[cellId] = prevFieldId;
        for (let i = 0; i < this.freeNeighbors[cellId].length; i++) {
            this.freeNeighbors[this.freeNeighbors[cellId][i]].push(cellId);
        }
        this.cellsForFields[prevFieldId].push(cellId);
        return;
    }

    // PACKABILITY

    private checkPackability(regionSize: number, cellsLeftToPlace: number): boolean {
        let isPackable = true;
        if (this.neighboringFields.length > 1 || regionSize === cellsLeftToPlace) {
            let fieldSizes = [];
            for (let i = 0; i < this.cellsForFields.length; i++) {
                fieldSizes.push(this.cellsForFields[i].length);
            }
            let sizesToPack = [];
            for (let i = 0; i < this.regionSizes.length; i++) {
                sizesToPack.push(this.regionSizes[i]);
            }
            let optionalFields = RegionCreatorUtils.arrayDeepcopy(this.neighboringFields);
            isPackable = RegionCreator.getIsPackable(fieldSizes, sizesToPack, optionalFields);
        }
        return isPackable;
    }

    private static getIsPackable(fieldSizes: number[], sizesToPack: number[], optionalFields: number[]): boolean {
        let necessaryFields = [];
        for (let i = 0; i < fieldSizes.length; i++) {
            if (optionalFields.indexOf(i) === -1) {
                necessaryFields.push(i);
            }
        }
        return RegionCreator.packNext(fieldSizes, sizesToPack, necessaryFields, optionalFields);
    }

    // PACK NECESSARY

    private static packNext(fieldSizes: number[], sizesToPack: number[], necessaryFields: number[], optionalFields: number[]): boolean {
        if (sizesToPack.length === 0) {
            if (necessaryFields.length === 0) {
                return true;
            } else if (RegionCreatorUtils.arrayGetSumOnElements(fieldSizes, necessaryFields) === 0) {
                return true;
            } else {
                return false;
            }
        }
        let size = sizesToPack[sizesToPack.length - 1];
        let count = 0;
        while (sizesToPack[sizesToPack.length - 1] === size) {
            count += 1;
            sizesToPack.pop();
            if (sizesToPack.length === 0) {
                break;
            }
        }

        let values = this.getFittableFields(fieldSizes, necessaryFields, size);
        let necFitSizes = values[0];  // necessary fittable sizes
        let necFitFields = values[1];  // necessary fittable fields
        let necFieldSpace = values[2];
        values = this.getFittableFields(fieldSizes, optionalFields, size);
        let optFieldSpace = values[2];

        if (count > necFieldSpace + optFieldSpace) {
            for (let i = 0; i < count; i++) {
                sizesToPack.push(size);
            }
            return false;
        }
        let necessaryMin = Math.max(0, count - Math.min(count, optFieldSpace));
        let necessaryMax = Math.min(count, necFieldSpace);

        for (let i = necessaryMin; i < necessaryMax + 1; i++) {
            let depth = 0;
            let optCount = count - i;
            let isPackable = RegionCreator.nextFieldSize(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optCount, necFitSizes, depth, necFitFields, necFieldSpace, i);
            if (isPackable) {
                return true;
            }
        }

        for (let i = 0; i < count; i++) {
            sizesToPack.push(size);
        }

        return false;
    }

    private static nextFieldSize(
        fieldSizes: number[], sizesToPack: number[], necessaryFields: number[],
        optionalFields: number[], size: number, optToFit: number, necFitSizes: number[],
        necDepth: number, necFitFields: number[][], necLeftTotal: number, necLeftToUse: number
    ): boolean {
        if (necDepth === necFitSizes.length) {
            return this.optPackNext(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optToFit);
        }

        let fieldCount = necFitFields[necDepth].length;
        let fitsInField = Math.floor(necFitSizes[necDepth] / size);
        let fittableCount = fieldCount * fitsInField;
        let maxUsable = Math.min(fittableCount, necLeftToUse);
        let minUsable = Math.max(0, necLeftToUse + fittableCount - necLeftTotal);
        for (let i = minUsable; i < maxUsable + 1; i++) {
            necLeftTotal -= fittableCount;
            necLeftToUse -= i;
            let prevUse = i + 1;
            let useLeft = i;
            let depthTwo = 0;

            let isPackable = RegionCreator.nextFieldSizePossibility(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optToFit, necFitSizes, necDepth, necFitFields, necLeftTotal, necLeftToUse, i, prevUse, useLeft, depthTwo);
            if (isPackable) {
                return true;
            }
            necLeftTotal += fittableCount;
            necLeftToUse += i;
        }

        return false;
    }

    private static nextFieldSizePossibility(
        fieldSizes: number[], sizesToPack: number[], necessaryFields: number[],
        optionalFields: number[], size: number, optToFit: number, necFitSizes: number[],
        necDepth: number, necFitFields: number[][], necLeftTotal: number, necLeftToUse: number,
        useInField: number, prevUse: number, useLeft: number, depthTwo: number
    ): boolean {
        if (useLeft === 0) {
            return RegionCreator.nextFieldSize(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optToFit, necFitSizes, necDepth + 1, necFitFields, necLeftTotal, necLeftToUse);
        }

        for (let i = 1; i < Math.min(useLeft, prevUse) + 1; i++) {
            let maxUsableSize = necFitFields[necDepth].length - depthTwo;
            if (i * maxUsableSize < useLeft) {
                continue
            }
            useLeft -= i;
            let fieldId = necFitFields[necDepth][depthTwo];
            fieldSizes[fieldId] -= size * i;
            depthTwo += 1;
            let isPackable = RegionCreator.nextFieldSizePossibility(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optToFit, necFitSizes, necDepth, necFitFields, necLeftTotal, necLeftToUse, useInField, i, useLeft, depthTwo);
            depthTwo -= 1;
            if (isPackable) {
                return true;
            }
            useLeft += i;
            fieldSizes[fieldId] += size * i
        }

        return false;
    }

    // PACK OPTIONAL

    private static optPackNext(
        fieldSizes: number[], sizesToPack: number[], necessaryFields: number[],
        optionalFields: number[], size: number, optToFit: number
    ): boolean {
        let values = this.getFittableFields(fieldSizes, optionalFields, size);
        let optFitSizes = values[0];  // optional fittable sizes
        let optFitFields = values[1];  // optional fittable fields
        let optFieldSpace = values[2];

        let depth = 0;
        return RegionCreator.optNextFieldSize(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optFitSizes, depth, optFitFields, optFieldSpace, optToFit);
    }

    private static optNextFieldSize(
        fieldSizes: number[], sizesToPack: number[], necessaryFields: number[],
        optionalFields: number[], size: number, optFitSizes: number[], optDepth: number,
        optFitFields: number[][], optLeftTotal: number, optLeftToUse: number
    ): boolean {
        if (optDepth === optFitSizes.length) {
            return this.packNext(fieldSizes, sizesToPack, necessaryFields, optionalFields);
        }

        let fieldCount = optFitFields[optDepth].length;
        let fitsInField = Math.floor(optFitSizes[optDepth] / size);
        let fittableCount = fieldCount * fitsInField;
        let maxUsable = Math.min(fittableCount, optLeftToUse);
        let minUsable = Math.max(0, optLeftToUse + fittableCount - optLeftTotal);
        for (let i = minUsable; i < maxUsable + 1; i++) {
            optLeftTotal -= fittableCount;
            optLeftToUse -= i;
            let prevUse = i + 1;
            let useLeft = i;
            let depthTwo = 0;

            let isPackable = RegionCreator.optNextFieldSizePossibility(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optFitSizes, optDepth, optFitFields, optLeftTotal, optLeftToUse, i, prevUse, useLeft, depthTwo);
            if (isPackable) {
                return true;
            }
            optLeftTotal += fittableCount;
            optLeftToUse += i;
        }

        return false;
    }

    private static optNextFieldSizePossibility(
        fieldSizes: number[], sizesToPack: number[], necessaryFields: number[],
        optionalFields: number[], size: number, optFitSizes: number[],
        optDepth: number, optFitFields: number[][], optLeftTotal: number, optLeftToUse: number,
        useInField: number, prevUse: number, useLeft: number, depthTwo: number
    ): boolean {
        if (useLeft === 0) {
            return RegionCreator.optNextFieldSize(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optFitSizes, optDepth + 1, optFitFields, optLeftTotal, optLeftToUse);
        }

        for (let i = 1; i < Math.min(useLeft, prevUse) + 1; i++) {
            let maxUsableSize = optFitFields[optDepth].length - depthTwo;
            if (i * maxUsableSize < useLeft) {
                continue
            }
            useLeft -= i;
            let fieldId = optFitFields[optDepth][depthTwo];
            fieldSizes[fieldId] -= size * i;
            depthTwo += 1;
            let isPackable = RegionCreator.optNextFieldSizePossibility(fieldSizes, sizesToPack, necessaryFields, optionalFields, size, optFitSizes, optDepth, optFitFields, optLeftTotal, optLeftToUse, useInField, i, useLeft, depthTwo);
            depthTwo -= 1;
            if (isPackable) {
                return true;
            }
            useLeft += i;
            fieldSizes[fieldId] += size * i
        }

        return false;
    }

    private static getFittableFields(fieldSizes: number[], fromFields: number[], size:number): any[] {
        let fittableSizes: number[];
        fittableSizes = [];
        let fittableFields: number[][];
        fittableFields = [];
        let fieldSpace = 0;
        for (let i = 0; i < fromFields.length; i++) {
            let field = fromFields[i];
            let fieldSize = fieldSizes[field];
            if (fieldSize >= size) {
                if (fittableSizes.indexOf(fieldSize) === -1) {
                    fittableSizes.push(fieldSize);
                }
                if (fittableFields.length < fittableSizes.length) {
                    fittableFields.push([]);
                }
                fittableFields[fittableFields.length - 1].push(field);
                fieldSpace += Math.floor(fieldSize / size);
            }
        }

        return [fittableSizes, fittableFields, fieldSpace]
    }

    // private print(): void {
    //     for (let y = 0; y < this.height; y++) {
    //         let h = [];
    //         for (let x = 0; x < this.width; x++) {
    //             h.push(this.regionForCell[y * this.width + x]);
    //         }
    //         console.log(h);
    //     }
    // }
}