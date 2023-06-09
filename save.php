<?php
$erasePrevious = true; // Test: removes all the previous saved text files
$encrypt = true;  // Encrypt the text
$mailTo = "Dany Pinoy <dany.pinoy@pindanet.be>"; // Empty string = do not send a mail
$badWords = array('viagra','cialis',
	'<p>hello! <a href="http://');
$savedir = "./saved/";

// Read form values
if ($_SERVER["REQUEST_METHOD"] == "POST") {
  $passphrase = $_POST["passphrase"];
  $passphrase = trim($passphrase);
  $passphrase = stripslashes($passphrase);
  $passphrase = htmlspecialchars($passphrase);
  $content = file_get_contents($_FILES["blobHTML"]["tmp_name"]);
} else {
  exit("Aborted: accept POST only!");
}

$url=__FILE__;

// Bad words filter
$badWordsDetected = 0;
$lowercaseContent = strtolower($content);
foreach ( $badWords as $word ) {
  if (strpos($lowercaseContent, $word) !== FALSE ) {
    exit("Aborted due to bad words!");
  }
}

if ($erasePrevious) { // Test: removes all the previous saved text files
  $files = glob($savedir.'*.gz');
  foreach ($files as $file) {
    if (is_file($file)) {
      unlink($file);
    }
  }
}
// Create directory to save the text files
if (!file_exists($savedir)) {
	if (!mkdir($savedir, 0777, true)) {
		die('Directory creation failed...');
	}
}

if ($encrypt) {
// If you want to encrypt the text
// https://encrypt-online.com/encrypt-and-decrypt-in-php
  $encrypt_method = "aes-256-cbc";
  $files = glob($savedir.'*.iv');
  $iv_length = openssl_cipher_iv_length($cipher = $encrypt_method);
  if (count($files) == 0) {
    $iv = openssl_random_pseudo_bytes($iv_length);
    $handle=fopen($savedir . base64_encode($iv) . ".iv","c") or exit("Creating file failed!");
    fclose($handle);
  } else {
    $info = pathinfo($files[0]);
    $file_name =  basename($files[0],'.'.$info['extension']);
    $iv = base64_decode($file_name);
  }
  if($iv_length != strlen($iv)) {
    exit("Encryption Error!");
  }
  $encrypted_string = openssl_encrypt($content, $encrypt_method, $passphrase, $options = OPENSSL_RAW_DATA, $iv);
}

// Save text
$bestand = tempnam ($savedir, date("Y-m-d-H-i-s"));
unlink($bestand);
$bestand .= ".gz";
$file=fopen($bestand,"a") or exit("Open file to write failed!");
fputs($file, gzcompress($encrypted_string, 9));
fclose($file);

if(strlen($mailTo) > 0) { // Mail sturen
  $Subject     = "Message on $url.";
  $comment = $content;
  $TextMessage = strip_tags(nl2br($comment),"<br>");
  $HTMLMessage = nl2br($comment);
  $FromName    = "PindaNet Texteditor";
  $FromEmail   = "texteditor@pindanet.be";
  $boundary1   =rand(0,9)."-"
  .rand(10000000000,9999999999)."-"
  .rand(10000000000,9999999999)."=:"
  .rand(10000,99999);
  
  $Headers     =<<<AKAM
From: $FromName <$FromEmail>
Reply-To: $FromEmail
MIME-Version: 1.0
Content-Type: multipart/alternative;
    boundary="$boundary1"
AKAM;

$Body        =<<<AKAM
MIME-Version: 1.0
Content-Type: multipart/alternative;
    boundary="$boundary1"

This is a multi-part message in MIME format.

--$boundary1
Content-Type: text/plain;
    charset="windows-1256"
Content-Transfer-Encoding: quoted-printable

$TextMessage
--$boundary1
Content-Type: text/html;
    charset="windows-1256"
Content-Transfer-Encoding: quoted-printable

$HTMLMessage

--$boundary1--
AKAM;

  mail($mailTo, $Subject, $Body, $Headers);
}

$sendback = "<p style='color: blue; font-weight: bold; text-decoration: underline;'>The following text was saved in the file $bestand</p>";
if($encrypt) {
  $sendback .= openssl_decrypt(gzuncompress(file_get_contents($bestand)), $encrypt_method, $passphrase, $options = OPENSSL_RAW_DATA, $iv);
  $sendback .= "<h2>The encrypted text:</h2>";
}
$sendback .= $encrypted_string;
echo $sendback;
?>
