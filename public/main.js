let grabbingNodeDetail = null;
let contextmenuNodeDetail = null;
let contextmenuAnchorId = null;

const listenNodeHover = () => {
  $('#vdc-wrapper').on('nodehover', (e) => {
    console.log('nodehover' + JSON.stringify(e.detail));
    $('#vdc-wrapper').css('cursor', 'grab');
    $('#room-label').text(e.detail.node.name);
    requestAnimationFrame(() => {
      $('#room-label').css({
        'visibility': 'visible',
        'scale': '1',
        'opacity': '1',
        'transition':
          'scale 96ms ease-in,' +
          'opacity 96ms ease-in'
      });
    })
  });
}

const listenNodeUnhover = () => {
  $('#vdc-wrapper').on('nodeunhover', (e) => {
    console.log('nodeunhover' + JSON.stringify(e.detail));
    $('#vdc-wrapper').css('cursor', '');

    requestAnimationFrame(() => {
      $('#room-label').css({
        'visibility': '',
        'scale': '',
        'opacity': '',
        'transition': ''
      });
    });
  });
}

const listenNodeClickOnce = () => {
  $('#vdc-wrapper').one('vdcclick', (e) => {
    console.log('vdcclick' + JSON.stringify(e.detail));
    if (e.detail.node) {

      grabbingNodeDetail = e.detail.node.node;
  
      $('#vdc-wrapper').css('cursor', 'grabbing');
      $('#vdc-wrapper').off('nodehover');
      $('#vdc-wrapper').off('nodeunhover');
      $('#vdc-wrapper').off('nodecontextmenu');
  
      requestAnimationFrame(() => {
        $('#room-label').css({
          'visibility': '',
          'scale': '',
          'opacity': '',
          'transition': ''
        });
      });
  
      vdcController.requestLiftNode(grabbingNodeDetail.id);
  
      $('#vdc-wrapper').on('slothover', (ev) => {
        const nodeIds = vdcController.testSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber);
        if (nodeIds.filter(nodeId => nodeId !== grabbingNodeDetail.id).length > 0){
          vdcController.highlightSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber, false);
        } else {
          vdcController.highlightSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber, true);

        }
      });
      $('#vdc-wrapper').on('slotunhover', (ev) => {
        vdcController.unhighlightSlots(ev.detail.clusterId, ev.detail.rackIndex, ev.detail.slotIndex, grabbingNodeDetail.uNumber);
      })
      listenSlotClickOnce();
      vdcController.refreshSlothoverEvent();

    } else {
      listenNodeClickOnce();
    }
  });
}

const listenSlotClickOnce = () => {
  $('#vdc-wrapper').one('vdcclick', async (e) => {
    console.log('vdcclick' + JSON.stringify(e.detail));
    const slotClickDetail = e.detail.slot;

    $('#vdc-wrapper').css('cursor', '');
    $('#vdc-wrapper').off('slothover');
    $('#vdc-wrapper').off('slotunhover');

    if (slotClickDetail) {

      vdcController.unhighlightSlots(slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, grabbingNodeDetail.uNumber);

      const nodeIds = vdcController.testSlots(slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, grabbingNodeDetail.uNumber);
      if (slotClickDetail.slotIndex !== grabbingNodeDetail.index && nodeIds.filter(nodeId => nodeId !== grabbingNodeDetail.id).length === 0){
  
        const response = await fetch('/node', {
          'method': 'POST',
          'body': JSON.stringify({
            'action': 'move',
            'nodeId': grabbingNodeDetail.id,
            'targetClusterId': slotClickDetail.clusterId,
            'targetRackIndex': slotClickDetail.rackIndex,
            'targetTopSlotIndex': slotClickDetail.slotIndex,
          })
        });
        if (response.ok) {
          vdcController.requestMoveNode(grabbingNodeDetail.id, slotClickDetail.clusterId, slotClickDetail.rackIndex, slotClickDetail.slotIndex, () => {
            listenNodeHover();
            listenNodeUnhover();
            listenNodeClickOnce();
            listenNodeContextMenuOnce();
            vdcController.refreshNodehoverEvent();
          });
          return;
        }
      }
    }

    vdcController.requestPushinNode(grabbingNodeDetail.id, () => {
      listenNodeHover();
      listenNodeUnhover();
      listenNodeClickOnce();
      listenNodeContextMenuOnce();
      vdcController.refreshNodehoverEvent();
    });
  });
}

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
      if(e.detail.node.status === 'running') {
        $('#room-menu-option-stop-node').css({
          'display': 'block'
        })
      }else if(e.detail.node.status === 'stopped') {
        $('#room-menu-option-start-node').css({
          'display': 'block'
        })
      }

      $('#room-label').css({
        'visibility': '',
        'scale': '',
        'opacity': '',
        'transition': ''
      });
      $('#room-menu-wrapper').css({
        'visibility': 'visible',
        'scale': '1',
        'opacity': '1',
        'transition':
          'scale 96ms ease-in,' +
          'opacity 96ms ease-in'
      });
    });
  });
}

const closeRoomMenu = function() {
  vdcController.removeAnchor(contextmenuAnchorId);
  $('#vdc-wrapper').off('anchormove');
  listenNodeHover();
  listenNodeUnhover();
  listenNodeClickOnce();
  listenNodeContextMenuOnce();
  vdcController.refreshNodehoverEvent();
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

window.onload = async function () {
  // read dummy data
  const res = await fetch('/world');
  const vdcRoomData = await res.json();

  globalThis.vdcController = globalThis.initVDC('vdc-wrapper', vdcRoomData);
  const initialFocusingCluster = vdcRoomData.clusters[0];
  if(initialFocusingCluster) {
    globalThis.vdcController.requestCameraStreetView(initialFocusingCluster.id);
  }

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

  listenNodeHover();
  listenNodeUnhover();
  listenNodeClickOnce();
  listenNodeContextMenuOnce();
  
}
