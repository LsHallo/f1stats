<?php
  $credentials = parse_ini_file("credentials.ini");

  $db = mysqli_connect($credentials['host'], $credentials['user'], $credentials['password'], $credentials['database']);
  if (mysqli_connect_errno()) {
    printf("Connect failed: %s\n", mysqli_connect_error());
    exit();
  }
  $to_return = [];
  $result = false;

  switch($_GET["type"]) {
    case "minmax":
      $result = mysqli_query($db, "SELECT min(time) as min, max(time) as max FROM f1stats");
      $fetched = mysqli_fetch_assoc($result);
      $to_return = [$fetched['min'], $fetched['max']];
      break;
    case "data":
      if(isset($_GET["from"]) && isset($_GET["to"])) {
        $from = mysqli_real_escape_string($db, $_GET["from"]);
        $to = mysqli_real_escape_string($db, $_GET["to"]);
        $result = mysqli_query($db, "SELECT time, f1, f1_5, f1feeder FROM f1stats WHERE time > $from AND time < $to");
      } else {
        $result = mysqli_query($db, "SELECT time, f1, f1_5, f1feeder FROM f1stats");
      }
      if($result) {
        while($row = mysqli_fetch_assoc($result)) {
          $to_return[] = array($row["time"], $row["f1"], $row["f1_5"], $row["f1feeder"]);
        }
      }
      break;
  }

  mysqli_close($db);
  echo json_encode($to_return);
