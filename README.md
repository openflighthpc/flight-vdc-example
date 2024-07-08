# Flight Virtual Data Centre Example

For testing [Flight VDC Core](https://github.com/openflighthpc/flight-vdc-core).

## Setup 

```
# Initialise VDC library
git submodule init

# Install Web App Dependencies
bundle install
ruby vdc.rb
```

Visit http://localhost:4567 and see the following:
![](img/index.png)

## Features

- Toggling between "Top Down" and "Cluster" views with the buttons at the top
- Turning nodes on and off (right-click on them and select start/stop depending on current status) 
- Moving nodes to new slots in a rack (click on a node to unrack it, click in another slot to rerack it) 
