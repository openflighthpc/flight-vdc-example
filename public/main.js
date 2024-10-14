let grabbingNodeDetail = null, contextmenuNodeDetail = null, contextmenuAnchorId = null, hoveredClusterId = null, selectedCluster = null;

// Function for managing label visibility
const setLabelVisibility = (visible) => {
  $('#room-label').css({
    'visibility': visible ? 'visible' : '',
    'scale': visible ? '1' : '',
    'opacity': visible ? '1' : '',
    'transition': visible ? 'scale 96ms ease-in, opacity 96ms ease-in' : ''
  });
};


// Function for handling rack hover events
const onRackHover = (e, text, trigger) => {
  console.log(`Rack Hover Event: ${JSON.stringify(e.detail)}`);
  $('#vdc-wrapper').css('cursor', 'grab');
  $('#room-label').text(text);
  requestAnimationFrame(() => setLabelVisibility(true));
  hoveredClusterId = text;
};

// Function for handling node hover events
const onNodeHover = (e, text, trigger) => {
  if (e.detail.clusterId === selectedCluster) {
    console.log(`Node Hover Event: ${JSON.stringify(e.detail)}`);
    vdcController.outlineNode(e.detail.node.id);
    $('#vdc-wrapper').css('cursor', 'grab');
    $('#room-label').text(text);
    requestAnimationFrame(() => setLabelVisibility(true));
  } else {
    console.log(`Ignoring Node Hover Event: ${JSON.stringify(e.detail)}`);
  }
};

// Function for handling rack unhover events
const onRackUnhover = (e, trigger) => {
  console.log(`Rack Unhover Event: ${JSON.stringify(e.detail)}`);
  $('#vdc-wrapper').css('cursor', '');
  requestAnimationFrame(() => setLabelVisibility(false));
  hoveredClusterId = null;
};

// Function for handling node unhover events
const onNodeUnhover = (e, trigger) => {
  if (typeof e.detail !== 'undefined' && e.detail.clusterId === selectedCluster) {
    console.log(`Node Unhover Event: ${JSON.stringify(e.detail)}`);
    vdcController.unoutlineNode(e.detail.node.id);
    $('#vdc-wrapper').css('cursor', '');
    requestAnimationFrame(() => setLabelVisibility(false));
  } else {
    console.log(`Ignoring Node Unhover Event: ${JSON.stringify(e.detail)}`);
  }
};

// Disable street view events (node: hover, unhover, click)
const disableStreetViewEvents = () => {
  console.log("Disabling street view events"); 
  // Tidy up anything left around
  $('#vdc-wrapper').trigger('nodeunhover');
  $('#vdc-wrapper').trigger('slotunhover');
  // Disable
  $('#vdc-wrapper').off('nodehover');
  $('#vdc-wrapper').off('nodeunhover');
  $('#vdc-wrapper').off('slothover');
  $('#vdc-wrapper').off('slotunhover');
  $('#vdc-wrapper').off('nodecontextmenu');
  $('#vdc-wrapper').off('click');

}

const enableStreetViewEvents = () => {
  $('#vdc-wrapper').on('nodehover', (e) => onNodeHover(e, e.detail.node.name, 'nodehover'));
  $('#vdc-wrapper').on('nodeunhover', (e) => onNodeUnhover(e, 'nodeunhover'));
  listenNodeClickOnce();
  listenNodeContextMenuOnce();
  vdcController.refreshNodehoverEvent();
}

const goStreetView = (hoveredClusterId) => {
  disableTopDownEvents();
  console.log(`Requesting street view for ${hoveredClusterId}`);
  vdcController.requestCameraStreetView(hoveredClusterId);
  selectedCluster = hoveredClusterId;
  enableStreetViewEvents();
}

// Disable top-down events (rack: hover, unhover, click)
const disableTopDownEvents = () => {
  console.log("Disabling rack view events"); 
  // Tidy up anything left around
  $('#vdc-wrapper').trigger('rackunhover');
  // Disable
  $('#vdc-wrapper').off('rackhover');
  $('#vdc-wrapper').off('rackunhover');
  $('#vdc-wrapper').off('click');
}

const goTopDownView = () => {
  disableStreetViewEvents();
  vdcController.requestCameraTopDownView();
  selectedCluster = null;
  $('#vdc-wrapper').on('rackhover', (e) => onRackHover(e, e.detail.clusterId, 'rackhover'));
  $('#vdc-wrapper').on('rackunhover', (e) => onRackUnhover(e, 'rackunhover'));

  // Handle street view transition
  $('#vdc-wrapper').on('click', (e) => {
    if (hoveredClusterId) {
      console.log('Requesting street view for ' + hoveredClusterId);
      goStreetView(hoveredClusterId);
    }
  });
}

const listenNodeClickOnce = () => {
  $('#vdc-wrapper').one('vdcclick', (e) => {
    console.log('Node Click Event: ' + JSON.stringify(e.detail));
    if (e.detail.node) {
      if (e.detail.node.clusterId === selectedCluster) {
        grabbingNodeDetail = e.detail.node.node;
        grabbingNodeDetail.rackIndex = e.detail.node.rackIndex;
    
        $('#vdc-wrapper').css('cursor', 'grabbing');
        disableStreetViewEvents();
        disableTopDownEvents();
    
        vdcController.unoutlineNode(grabbingNodeDetail.id);
        requestAnimationFrame(() => setLabelVisibility(false));
    
        vdcController.requestLiftNode(grabbingNodeDetail.id);
    
        $('#vdc-wrapper').on('slothover', (ev) => {
          const nodeIds = vdcController.testSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber);
          vdcController.highlightSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber, nodeIds.filter(id => id !== grabbingNodeDetail.id).length === 0);
        }).on('slotunhover', (ev) => {
          vdcController.unhighlightSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber);
        })
        $('#vdc-wrapper').one('vdcclick', handleSlotClick);
        vdcController.refreshSlothoverEvent();
      } else {
        listenNodeClickOnce();
      }
    }
  });
}

// Handle Data Overlay Toggle
const dataOverlayHelper = () => {
    console.log('Data overlay helper');
    if (selectedCluster) {
        console.log(`Displaying data for ${selectedCluster}`);
        // Get array of all nodes for selectedCluster
        // Iterate through nodes and turn on data display for them
        // vdcController.addDataOverlay(name, data, options);
    } else {
        console.log('No cluster selected');
    }
}

// Handle Slot Clicks
const handleSlotClick = async (e) => {
  console.log('Slot Click Event: ' + JSON.stringify(e.detail));
  const slotClickDetail = e.detail.slot;
  $('#vdc-wrapper').off('slothover slotunhover').css('cursor', '');

  if (slotClickDetail) {
    vdcController.unhighlightSlots(slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, grabbingNodeDetail.uNumber);

    const nodeIds = vdcController.testSlots(slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, grabbingNodeDetail.uNumber);

    // Only move if node not being placed back in same place
    if ((slotClickDetail.slotIndex !== grabbingNodeDetail.index || slotClickDetail.rackIndex !== grabbingNodeDetail.rackIndex) && nodeIds.filter(id => id !== grabbingNodeDetail.id).length === 0) {
      const response = await fetch('/node', {
        method: 'POST',
        body: JSON.stringify({
          action: 'move',
          nodeId: grabbingNodeDetail.id,
          targetClusterId: slotClickDetail.clusterId,
          targetRackIndex: slotClickDetail.rackIndex,
          targetTopSlotIndex: slotClickDetail.slotIndex,
        })
      });

      if (response.ok) {
        vdcController.requestMoveNode(grabbingNodeDetail.id, slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, enableStreetViewEvents);
        return;
      }
    }
  }
  vdcController.requestPushinNode(grabbingNodeDetail.id, enableStreetViewEvents);
};

const listenNodeContextMenuOnce = () => {
  $('#vdc-wrapper').one('contextmenu', (e) => {
    const roomWrapperDimensions = e.currentTarget.getBoundingClientRect();
    const menuTranslateX = e.clientX - roomWrapperDimensions.left;
    const menuTranslateY = e.clientY - roomWrapperDimensions.top;
    requestAnimationFrame(() => {
      $('#room-menu-wrapper').css({
        'translate': `${menuTranslateX}px ${menuTranslateY}px`,
      });
    })
  });
  $('#vdc-wrapper').one('nodecontextmenu', (e) => {
    console.log('nodecontextmenu' + JSON.stringify(e.detail));
    contextmenuNodeDetail = e.detail.node;

    $('#vdc-wrapper').css('cursor', '');
    $('#vdc-wrapper').off('nodehover');
    $('#vdc-wrapper').off('nodeunhover');
    $('#vdc-wrapper').off('vdcclick');

    contextmenuAnchorId = vdcController.addAnchor(e.detail.position.x, e.detail.position.y, e.detail.position.z);
    $('#vdc-wrapper').on('anchormove', (e) => {
      console.log(`anchormove${JSON.stringify(e.detail)}`);
      if (e.detail.anchorId === contextmenuAnchorId) {
        const roomWrapperDimensions = e.currentTarget.getBoundingClientRect();
        const menuTranslateX = e.detail.clientX - roomWrapperDimensions.left;
        const menuTranslateY = e.detail.clientY - roomWrapperDimensions.top;
        $('#room-menu-wrapper').css({
          'translate': `${menuTranslateX}px ${menuTranslateY}px`,
        });
      }
    });
    const listenCancelMenuOnce = () => {
      $('#vdc-wrapper').one('vdcclick', (_ev) => {
        vdcController.unoutlineNode(e.detail.node.id);
        closeRoomMenu();
      });
    }
    listenCancelMenuOnce();

    requestAnimationFrame(() => {
      // generate menu options
      // clear menu options
      $('.room-menu-option').css({
        'display': ''
      })
      // populate available menu options
      $('#room-menu-title').text(e.detail.node.name);
      
      // Toggle start and stop menus accordingly
      const isRunning = e.detail.node.status === 'running';
      $('#room-menu-option-stop-node').toggle(isRunning);
      $('#room-menu-option-start-node').toggle(!isRunning);

      requestAnimationFrame(() => setLabelVisibility(false));
      $('#room-menu-wrapper').css({
        'visibility': 'visible',
        'scale': '1',
        'opacity': '1',
        'transition':
          'scale 96ms ease-in, opacity 96ms ease-in'
      });
    });
  });
}

const closeRoomMenu = function() {
  vdcController.removeAnchor(contextmenuAnchorId);
  $('#vdc-wrapper').off('anchormove');
  enableStreetViewEvents();
  requestAnimationFrame(() => {
    $('#room-menu-wrapper').css({
      'visibility': '',
      'scale': '',
      'opacity': '',
      'transition':
        'visibility 96ms ease-in,' +
        'scale 96ms ease-in,' +
        'opacity 96ms ease-in'
    });
  })
}

const fetchDeterminedNodeStatus = async function(nodeId) {
  const nodeResponse = await fetch(`/node?nodeId=${nodeId}&until=running,stopped`);
  if (nodeResponse.ok) {
    const nodeResponseBody = await nodeResponse.json();
    return nodeResponseBody.status;
  }
  return await fetchDeterminedNodeStatus();
}

async function loadClusterData() { 
  console.log("Reloading cluster data");
  const res = await fetch('/world');
  const vdcRoomData = await res.json();
  this.vdcController.updateClustersData(vdcRoomData);
}


// Setting up the initial Top Down view and listeners
window.onload = async function () {
  // read dummy data
  const res = await fetch('/world');
  vdcRoomData = await res.json();

  globalThis.vdcController = globalThis.initVDC('vdc-wrapper', vdcRoomData);

  goTopDownView();

  // Handle pending nodes 
  const pendingNodeIds = vdcRoomData.clusters
    .map(cluster => cluster.racks)
    .flat(Infinity)
    .map(rack => rack.nodes)
    .flat(Infinity)
    .filter(node => !['running', 'stopped'].includes(node.status))
    .map(node => node.id);
  pendingNodeIds.forEach((nodeId) => {
    fetchDeterminedNodeStatus(nodeId)
      .then(nodeStatus => {
        if (nodeStatus === 'running') {
          vdcController.launchNode(nodeId);
        } else if (nodeStatus === 'stopped') {
          vdcController.shutDownNode(nodeId);
        }
      });
  });

  // Room Navigation
  $('#vdc-wrapper').on('mousemove', (e) => {
    const roomWrapperDimensions = e.currentTarget.getBoundingClientRect();
    const labelTranslateX = e.clientX - roomWrapperDimensions.left;
    const labelTranslateY = e.clientY - roomWrapperDimensions.top;
    requestAnimationFrame(() => {
      $('#room-label').css({
        'translate': `${labelTranslateX}px ${labelTranslateY}px`
      });
    })
  });

  window.addEventListener('wheel', (e) => {
    this.vdcController.zoom(e.deltaY);
  });

  $('#room-menu-option-start-node').on('click', async (e) => {
    e.stopPropagation();
    $('#vdc-wrapper').off('vdcclick');
    closeRoomMenu();
    const nodeId = contextmenuNodeDetail.id;
    vdcController.pauseNode(nodeId);
    const response = await fetch('/node', {
      'method': 'POST',
      'body': JSON.stringify({
        'action': 'start',
        'nodeId': nodeId
      })
    });
    if (response.ok) {
      const nodeStatus = await fetchDeterminedNodeStatus(nodeId);
      if (nodeStatus === 'running') {
        vdcController.launchNode(nodeId);
      } else if (nodeStatus === 'stopped') {
        vdcController.shutDownNode(nodeId);
      }
    }
  })
  $('#room-menu-option-stop-node').on('click', async (e) => {
    e.stopPropagation();
    $('#vdc-wrapper').off('vdcclick');
    closeRoomMenu();
    const nodeId = contextmenuNodeDetail.id;
    vdcController.pauseNode(nodeId);
    const response = await fetch('/node', {
      'method': 'POST',
      'body': JSON.stringify({
        'action': 'stop',
        'nodeId': nodeId
      })
    });
    if (response.ok) {
      const nodeStatus = await fetchDeterminedNodeStatus(nodeId);
      if (nodeStatus === 'running') {
        vdcController.launchNode(nodeId);
      } else if (nodeStatus === 'stopped') {
        vdcController.shutDownNode(nodeId);
      }
    }
  });
}
setInterval(loadClusterData, 10000);

