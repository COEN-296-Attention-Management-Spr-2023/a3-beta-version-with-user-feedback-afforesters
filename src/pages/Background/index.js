console.log('Running background script...');

// timer
let timer_model = {
  id: '',
  startTime: null,
  time: 0,
  timeRange: 0,
  tabIds: [],
};

let timer = timer_model

let timerInterval;

function minutesDiff(date1, date2) {
  var diff = (date1.getTime() - date2.getTime()) / 1000;
  diff /= 60;
  return Math.abs(Math.round(diff));
}

const startTimer = () => {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const currTime = new Date();
    if (minutesDiff(currTime, timer.startTime) >= timer.timeRange) {
      console.log('time is up!!!!');
      // todo - save data to local storage

      clearInterval(timerInterval);
    }
  }, 1000);
};

const startTimeReqHandler = (request) => {
  const { domainName, timeRange, tabId } = request;
  console.log('START_TIMER', domainName, timeRange, tabId);

  timer.startTime = new Date();
  timer.id = domainName;
  timer.timeRange = timeRange;
  startTimer();
  // todo save to local storage
  //
};

const getTimeReqHandler = (request, sendResponse) => {
  const { domainName } = request;
  console.log('GET_TIME', domainName);
  const currTime = new Date();

  if (domainName === timer.id && timer.startTime != null) {
    const diff = minutesDiff(currTime, timer.startTime);
    sendResponse({ time: diff, timeIsUp: diff >= timer.timeRange });
  } else {
    sendResponse({ time: 0, timeIsUp: false });
  }
};

const setTimeBlock = () =>{
  console.log('sending block message ...')
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) =>{
    console.log
    chrome.tabs.sendMessage(
      tabs[0].id,
      { cmd: "TIME_IS_UP" },
      function (response) {
        console.log(response.status);
      }
    )
  })
};


// Function to update the groups status
const updateGroupStatus = (callback) => {
  chrome.tabs.query({}, (tabs) => {
    let openGroupIds = tabs
      .map(tab => tab.groupId)
      .filter((value, index, self) => value !== chrome.tabGroups.TAB_GROUP_ID_NONE && self.indexOf(value) === index);

    chrome.storage.local.get(['groups', 'groupIds'], function (data) {
      let groupIds = data.groupIds || {};
      let groups = data.groups || {};

      for (let priority in groupIds) {
        if (!openGroupIds.includes(groupIds[priority])) {
          delete groups[groupIds[priority]];
          delete groupIds[priority];
        }
      }

      chrome.storage.local.set({ groups: groups, groupIds: groupIds }, function () {
        console.log('Updated groups and groupIds after verification:', groups, groupIds);
        callback();
      });
    });
  });
};




chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  if (request.cmd === 'setPriority') {
    let color;
    switch (request.priority) {
      case 'low':
        color = 'green';
        break;
      case 'medium':
        color = 'yellow';
        break;
      case 'high':
        color = 'red';
        break;
      default:
        color = 'grey';
    }

    updateGroupStatus(() => {
    chrome.storage.local.get(['groupIds', 'groups', 'tabs'], function (data) {
      console.log('Retrieved data:', data);

      let groupIds = data.groupIds || {};
      let groups = data.groups || {};
      let tabs = data.tabs || {};

      console.log('Current groupIds:', groupIds);
      console.log('Current groups:', groups);
      console.log('Current tabs:', tabs);

      if (groupIds[request.priority] !== undefined) {
        console.log('Group exists for priority, adding tab to group...');
        chrome.tabs.group(
          {
            groupId: groupIds[request.priority],
            tabIds: request.tabId,
          },
          function () {
            console.log('Tab added to existing group.');
            tabs[request.tabId] = {
              priority: request.priority,
              groupId: groupIds[request.priority],
            };
            chrome.storage.local.set({ tabs: tabs }, function () {
              console.log('Updated tab data:', tabs);
              sendResponse({ groupId: groupIds[request.priority] });
            });
          }
        );
      } else {
        console.log('No group exists for priority, creating new group...');
        chrome.tabs.group(
          {
            tabIds: request.tabId,
          },
          function (newGroupId) {
            console.log('New group created.');
            chrome.tabGroups.update(
              newGroupId,
              { color: color, title: request.priority },
              function () {
                console.log('Group updated with color and title.');
                groupIds[request.priority] = newGroupId;
                groups[newGroupId] = {
                  color: color,
                  title: request.priority,
                };
                tabs[request.tabId] = {
                  priority: request.priority,
                  groupId: newGroupId,
                };
                chrome.storage.local.set(
                  { groupIds: groupIds, groups: groups, tabs: tabs },
                  function () {
                    console.log(
                      'Updated group and tab data:',
                      groupIds,
                      groups,
                      tabs
                    );
                    sendResponse({ groupId: newGroupId });
                  }
                );
              }
            );
          }
        );
      }
    });
  });

    return true; // Keeps the message channel open while waiting for async response.
  } else if (request.cmd === 'START_TIMER') {
    startTimeReqHandler(request);
  } else if (request.cmd === 'GET_TIME') {
    getTimeReqHandler(request, sendResponse);
  } else if (request.cmd === 'TIME_IS_UP'){
    setTimeBlock();
   
  }
  else if (request.cmd === 'RESET_TIME' && request.from != 'content'){
    console.log("received RESET_TIME FROM POPUP ..." )
    timer = timer_model;
    sendResponse({ time: 0, timeIsUp: false });
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  // Load the tabs from local storage
  chrome.storage.local.get(['tabs', 'groups', 'groupIds'], function (data) {
    let tabs = data.tabs || {};
    let groups = data.groups || {};
    let groupIds = data.groupIds || {};
    let removedTab = tabs[tabId];
    if (removedTab) {
      // Check if the tab was in a group
      let groupId = removedTab.groupId;
      if (groupId) {
        // Remove the tab from local storage
        delete tabs[tabId];

        // Check if there are any other tabs in this group
        let otherTabsInGroup = Object.values(tabs).some(tab => tab.groupId === groupId);
        if (!otherTabsInGroup) {
          // If there are no other tabs in this group, remove the group
          delete groups[groupId];
          let groupPriority = Object.keys(groupIds).find(priority => groupIds[priority] === groupId);
          if (groupPriority) {
            delete groupIds[groupPriority];
          }
        }

        // Save the updated tabs, groups, and groupIds back to local storage
        chrome.storage.local.set({ tabs: tabs, groups: groups, groupIds: groupIds }, function () {
          console.log('Updated tabs, groups, and groupIds after tab removal:', tabs, groups, groupIds);
        });
      }
    }
  });
});