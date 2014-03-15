testResolve([0, 2], [0, 1, 2, 3]);
console.log("\n");
testResolve([0, 1, 2], [0]);
console.log("\n");
testResolve([0, 1], [0, 1, 2, 3]);
console.log("\n");
testResolve([0, 1, 2], [0]);
console.log("\n");
testResolve([], [0, 1]);
console.log("\n");
testResolve([0, 1], []);

function testResolve(remote, local) {
  console.log("before", remote, local, isEqual(remote, local));

  var shorter = remote.length < local.length ? remote : local;
  var diverges = -1;

  for (var i = 0; i < shorter.length; i++) {
    if (remote[i] != local[i]) {
      diverges = i;
      break;
    }
  }

  // they diverge somewhere in the middle
  if (diverges != -1) {
    var remoteActionsAfterDiverge = remote.slice(diverges);
    local.splice.apply(local, [diverges, local.length - diverges].concat(remoteActionsAfterDiverge));
  } else if (shorter == remote) {
    // remove everything off the end of local
    local.splice(remote.length, local.length - remote.length);
  } else {
    // shorter must be the local one
    var remoteActionsAfterLocal = remote.slice(local.length);
    local.splice.apply(local, [local.length, 0].concat(remoteActionsAfterLocal));
  }


  console.log("after", remote, local, isEqual(remote, local));

  function isEqual(arr1, arr2) {
    if (arr1.length != arr2.length) {
      return false;
    }

    for (var i = 0; i < arr1.length; i++) {
      if (arr1[i].id != arr2[i].id) {
        return false;
      }
    }

    return true;
  }
}