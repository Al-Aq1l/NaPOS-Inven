<?php

return [
    'enabled' => env('ESC_POS_ENABLED', true),
    'printer_path' => env('ESC_POS_PRINTER_PATH', ''),
    'line_width' => (int) env('ESC_POS_LINE_WIDTH', 32),
    'feed_lines' => (int) env('ESC_POS_FEED_LINES', 4),
    'cut' => env('ESC_POS_CUT', true),
    'com_mode' => env('ESC_POS_COM_MODE', ''),
];
