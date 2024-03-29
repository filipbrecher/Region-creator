# Region-creator

This project is licensed under the terms of the Creative Commons Zero v1.0 Universal license.

## Description

To run the program, you need the following files: regionCreator.ts and regionCreatorUtils.ts.

To run this program, you need to create a new RegionCreator object first.
You can then customize the object's region generation to your likings.
You can then generate the board and access it.

## Usage

### Setting up the basics

First, make a new RegionCreator object. It takes two arguments that are used for telling,
which cells you are using and which pairs of cells are adjacent.

The first argument can be of two types, but has a common name "cellIdentifier".
* cellCount: number
  * You must pass in an integer value bigger than 0. A board with cellIds of numbers from
0 to cellCount - 1 will be generated.
* cellIds: number[]
  * If you pass in an array of integers, a board with cellIds of those values will be
generated. Do not pass in duplicates.

The second argument can be of two types as well. It has a common name "pairIdentifier".
* masterWidth: number
  * You must pass in an integer value bigger than 0. RegionCreator will now generate
pairs of adjacent cells as if the cellIds were the ids of a rectangle with the width
equal to the masterWidth and the cell with the index 0 being the leftmost cell. This
also works with cellIds smaller than 0.
* pairs: [number, number][]
  * You must pass in an array of tuples with integer values, that are in the range of
cellIds. There shouldn't be any duplicates (even if the integers have swapped positions)
and a cell can't be its own adjacent cell. Any pairs with a value out of the range of
cellIds will be ignored.

Some examples:

    let regionCreator = new RegionCreator(81, 9);
    let regionCreator = new RegionCreator(4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
    let regionCreator = new RegionCreator([0, 2, 3, 4, 5, 6], 4);
    let regionCreator = new RegionCreator([0, 2, 3, 4, 5, 6], [[0, 4], [4, 5], [5, 6], [6, 2], [2, 3], [3, 0]]);

### Region sizes

You now need to create region sizes which will then be inserted into the board.
To do that, you can (but don't have to) first specify which region sizes you want to use.
You can specify like this all the region sizes, but you can also specify only
some of them and the rest of them will be created later. 
But don't pass in region sizes that would not fit in the board.
To do that, just set the following variable to the desired region sizes.
Also, forced region sizes are by default set to an empty array.

    regionCreator.forcedRegionSizes = [7, 7, 7];

You can always change them later. If you change them to an empty array or a "null",
all the region sizes will be generated automatically.

    regionCreator.forcedRegionSizes = null;
    regionCreator.forcedRegionSizes = [];

Next you need to specify conditions for generating the rest of the region sizes.
If you already set all the region sizes, you still need to call this method,
but you just won't be passing in any arguments.

    regionCreator.setRegionConditions();

In other circumstances, you can customize the values to get desirable region sizes.
If you leave the arguments as "null", default values will be generated.
The method has the following parameters:
* strictness: number | null
    * Set it between the values of 0 and 1 including. Zero means that the region
sizes will be generated completely random, while one means that only region sizes
with the size of the avgRegionSize will be generated.
* smallerRegionChance: number | null
    * Set it between the values of 0 and 1 including. One means that every region
size generated will be smaller than or equal to the avgRegionSize.
* includeAvgRegionSize: boolean | null
    * If this is set to false, then the avgRegionSize shouldn't be set to the same
values as the minRegionSize or maxRegionSize.
* avgRegionSize: number | null
    * This is the average region size you want your regions to be.
* minRegionSize: number | null
    * This is the smallest size your regions will be. This must be equal or smaller
than the avgRegionSize.
* maxRegionSize: number | null
    * This is the largest size your regions will be. This must be equal or bigger
than the avgRegionSize.

It can sometimes happen, during the generation of region sizes, that a size
smaller than the minRegionSize or bigger than the maxRegionSize will be generated.

After you've done all of this, you need to call a method to create the sizes.
You can call this method multiple times to get new region sizes. Here is the method:

    regionCreator.createNewRegionSizes();

Here are some more examples.

    regionCreator.setRegionConditions(0.6, 0.5, true, 5, 3, 6);
    regionCreator.createNewRegionSizes();

    regionCreator.forcedRegionSizes = [7, 7, 7, 7, 7, 7, 7, 7, 8];
    regionCreator.setRegionConditions();
    regionCreator.createNewRegionSizes();
    
    // we know regions with the size of 8 will fit in the board.
    regionCreator.setRegionConditions(1, null, true, 8);
    regionCreator.createNewRegionSizes();

You don't have to call the setForcedRegionSizes method before the setRegionConditions method.
Also, the reason why you need to create the region sizes yourself is that you are able to
generate multiple boards with the same random sizes this way.

### Shape customization

You can also customize which shapes are preferred by setting generation modes.
By default, the mode is set to 'default', which doesn't prioritize any cells over other cell.
Other modes are 'spaghetti' and 'blob'. Spaghetti generates the regions in such a way, that
each cell of the region has the least amount of neighbors. Blob generates regions in such a way,
that you end up with regions with clump shapes, similar to circles.

    regionCreator.mode = "spaghetti";

### Running the program

This method generates the board / regions:

    regionCreator.createNewBoard();

You can then access the regions or the board. They both give you copies.

By accessing the regions, you will
get an array of the individual regions. Each region will be an array of the cellIds
you specified/that got generated when you created the regionCreator object.

    let regionCreator = new RegionCreator([0, 2, 3, 4, 5, 6], 4);
    regionCreator.forcedRegionSizes = [3, 3];
    regionCreator.setRegionConditions();
    regionCreator.createNewRegionSizes();
    regionCreator.createNewBoard();
    if (regionCreator.hasBoard) {
      let regions = regionCreator.regions;
      // expected "regions" values: [[0, 4, 5], [2, 3, 6]] or [[2, 3, 6], [0, 4, 5]];
    }


By accessing the board, you will get an array with region numbers. Each value(region number)
is connected to the id that is the value's key. These ids go from 0 to the cell count and
are representing sorted cellIds(from lowest to highest)'s keys that got generated when
you created the regionCreator object. Accessing the board isn't recommended if you
generated the cellIds using the cellIdentifier "cellIds" and not "cellCount"(in the
constructor).

    let regionCreator = new RegionCreator(81, 9);
    regionCreator.setRegionConditions(0.6, 0.3, true, 8, 6, 10);
    regionCreator.createNewRegionSizes();
    regionCreator.createNewBoard();regionCreator.createNewBoard();
    if (regionCreator.hasBoard) {
      let board = regionCreator.board;
    }

If the program times out (maxTime is surpassed), it won't generate a board. So you always
need to check if a board has been generated using the hasBoard variable.

    regionCreator.createNewBoard();
    if (regionCreator.hasBoard) {
      let board = regionCreator.board;
    }

### Managing runtime

Sometimes the program can take a long time to create a board because it can get stuck.
To partially prevent this, you can set the  maximum amount of time you want the program
to try to create one board. If the program doesn't succeed to create it in that time,
it will try to create it again. You can set the time using the variable maxOneTime.
The time is set in seconds. This is set to 1 second by default, so if you are
creating a large board, it is recommended to adjust the time to your needs.

    regionCreator.maxOneTime = 0.1; // 0.1 seconds

You can do the same with the overall time the program is creating every board. So for
example if the program fails to create one board repeatedly, you can then stop it
entirely. This time is also set in seconds, using the variable maxTime. It is set
to 10 seconds by default.

    regionCreator.maxTime = 2; // 2 seconds

Furthermore, you can limit the amount of times the program will try to generate a board.
It is set to 100 tries by default. This can prevent cases where there is no solution for
the region sizes that got generated. Use the variable maxTries to adjust this.

    regionCreator.maxTries = 1000;

You can also enable logging using the variable doLog. This will post a message in
the console using console.log("message"); telling you the time it took the method
createNewBoard to execute. This will also post a message telling you the region sizes
that got generating when calling the createNewRegionSizes method.

    regionCreator.doLog = true;

You can also change the way the program chooses the first cell in which it starts generating
a new region. You change this by setting the generateFaster variable. It is set to true by
default. When the variable is set to true, the program will set the first cell of a newly
generated region to be the cell with the smallest id, if the region creation is not successful,
it will then find the next cell, and so on. If the variable is set to false, the program will
choose the first cell of a new region randomly. This could alter the generation of regions and
that is why this variable is included.

    regionCreator.generateFaster = false;
