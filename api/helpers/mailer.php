<?php
require_once __DIR__ . '/../config/mail.php';

function send_mail(string $to, string $subject, string $body): void {
    $host = MAIL_HOST;
    $port = MAIL_PORT;

    $fp = $port === 465
        ? fsockopen('ssl://' . $host, $port, $errno, $errstr, 15)
        : fsockopen($host, $port, $errno, $errstr, 15);

    if (!$fp) throw new RuntimeException("SMTP connect {$host}:{$port} failed: $errstr ($errno)");
    stream_set_timeout($fp, 15);

    smtp_read($fp);
    smtp_cmd($fp, 'EHLO localhost');

    if ($port === 587) {
        smtp_cmd($fp, 'STARTTLS');
        stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        smtp_cmd($fp, 'EHLO localhost');
    }

    smtp_cmd($fp, 'AUTH LOGIN');
    smtp_cmd($fp, base64_encode(MAIL_USER));
    smtp_cmd($fp, base64_encode(MAIL_PASS));
    smtp_cmd($fp, 'MAIL FROM:<' . MAIL_FROM . '>');
    smtp_cmd($fp, "RCPT TO:<$to>");
    smtp_cmd($fp, 'DATA');

    $enc_subject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $enc_from    = '=?UTF-8?B?' . base64_encode(MAIL_FROM_NAME) . '?=';
    fwrite($fp, "From: $enc_from <" . MAIL_FROM . ">\r\n");
    fwrite($fp, "To: $to\r\n");
    fwrite($fp, "Subject: $enc_subject\r\n");
    fwrite($fp, "MIME-Version: 1.0\r\n");
    fwrite($fp, "Content-Type: text/plain; charset=UTF-8\r\n");
    fwrite($fp, "Content-Transfer-Encoding: base64\r\n");
    fwrite($fp, "\r\n");
    fwrite($fp, chunk_split(base64_encode($body)));
    fwrite($fp, "\r\n.\r\n");

    smtp_read($fp);
    smtp_cmd($fp, 'QUIT');
    fclose($fp);
}

function smtp_cmd($fp, string $cmd): string {
    fwrite($fp, "$cmd\r\n");
    return smtp_read($fp);
}

function smtp_read($fp): string {
    $res = '';
    while ($line = fgets($fp, 512)) {
        $res .= $line;
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    return $res;
}
