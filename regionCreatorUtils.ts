class RegionCreatorUtils {

    public static createArray1d(length: number, value: any): any[] {
        let array = [];
        for (let i = 0; i < length; i++) {
            array.push(value);
        }
        return array;
    }

    public static createArrayIncremented(startValue: number, conditionValue: number): number[] {
        let array = [];
        for (let i = startValue; i < conditionValue; i++) {
            array.push(i);
        }
        return array;
    }

    public static arrayRemoveOne(array: number[], toRemove: number): number[] {
        return array.filter(function(e) { return e !== toRemove });
    }

    public static arrayGetSumOnElements(array: number[], elements: number[]): number {
        let sum = 0;
        for (let i = 0; i < elements.length; i++) {
            sum += array[elements[i]];
        }
        return sum;
    }

    public static arrayGetSum(array: number[]): number {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += array[i];
        }
        return sum;
    }

    public static arrayShuffle(array: any[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            let randomNum = Math.floor(Math.random() * (i + 1));
            let temp = array[i];
            array[i] = array[randomNum];
            array[randomNum] = temp;
        }
    }

    public static arraySortNumbers(array: number[], asc: boolean): number[] {
        array.sort(
            (a: number, b: number) => { return asc ? a - b : b - a; }
        );
        return array;
    }

    public static arrayDeepcopy(array: any): any {
        if (Array.isArray(array)) {
            let copy = [];
            for (let i = 0; i < array.length; i++) {
                copy.push(ArrayUtils.deepcopy(array[i]));
            }
            return copy;
        } else {
            return array;
        }
    }
}