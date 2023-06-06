# Region-creator

## Description

This repository contains two files. regionCreator.ts and regionCreatorUtils.ts

To run this program, you need to create a new RegionCreator object first.
You can then customize the object's region generation to your likings.
You can then generate the board and access it.

## Usage

### Setting up the basics

First, make a new RegionCreator object:

    let regionCreator = new RegionCreator();



### Region sizes

You now need to create region sizes which will then be inserted into the board.
To do that, you can (but don't have to) first specify which region sizes you want to use.
You can specify like this all the region sizes, but you can also specify only
some of them and the rest of them will be created later.
But don't pass in region sizes that would not fit in the board.
To do that, call the following method and pass in your desired region sizes.

    regionCreator.setForcedRegionSizes([7, 7, 7]);

If you want to change them later, just pass in the new desired sizes.
You can also pass in a "null" or an empty array to get rid of them

    regionCreator.setForcedRegionSizes(null);

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

It can sometimes happen during the generation of region sizes, that there will
be generated a size smaller than the minRegionSize or bigger than the maxRegionSize.

After you've done all of this, you need to call a method to create the sizes.
You can call this method multiple times to get new region sizes. Here is the method:

    regionCreator.createNewRegionSizes();

Here are some more examples.

    regionCreator.setRegionConditions(0.6, 0.5, true, 5, 3, 6);
    regionCreator.createNewRegionSizes();

    regionCreator.setForcedRegionSizes([7, 7, 7, 7, 7, 7, 7, 7, 8]);
    regionCreator.setRegionConditions();
    regionCreator.createNewRegionSizes();
    
    // we know regions with the size of 8 will fit on the board.
    regionCreator.setRegionConditions(1, null, true, 8);
    regionCreator.createNewRegionSizes();

You don't have to call the setForcedRegionSizes method before the setRegionConditions method.

### Shape customization

You can also customize which shapes are preferred using the method setSpaghetti.
By setting it to "true", regions will be generated so that they have as big of a circumference as they can have.
It is set to "false" by default.

    regionCreator.setSpaghetti(true);

### Running the program

This method generates the board:

    regionCreator.createNewBoard();

You can they access it using the board variable:

    let board = regionCreator.board;

