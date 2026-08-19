<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;

class BackupController extends Controller
{
    public function download()
    {
        $user = auth()->user();
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            abort(403, 'Only administrators and managers can download database backups.');
        }

        \App\Models\ActivityLog::log(
            'backup_downloaded',
            'Security',
            'Downloaded complete SQL database backup dump'
        );

        $tables = DB::select('SHOW TABLES');
        $databaseName = DB::getDatabaseName();
        $tableKey = 'Tables_in_' . $databaseName;

        $sql = "-- SmartPOS Database Backup\n";
        $sql .= "-- Generated: " . Carbon::now()->toDateTimeString() . "\n";
        $sql .= "-- Database: " . $databaseName . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $tableObj) {
            $table = $tableObj->$tableKey;

            // DDL: Drop & Create Table
            $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $createTable = DB::select("SHOW CREATE TABLE `{$table}`");
            $createSql = $createTable[0]->{'Create Table'} ?? '';
            $sql .= $createSql . ";\n\n";

            // DML: Insert statements
            $rows = DB::table($table)->get();
            if ($rows->count() > 0) {
                $sql .= "INSERT INTO `{$table}` VALUES \n";
                $insertValues = [];

                foreach ($rows as $row) {
                    $rowValues = [];
                    foreach ((array) $row as $value) {
                        if ($value === null) {
                            $rowValues[] = "NULL";
                        } elseif (is_numeric($value)) {
                            $rowValues[] = $value;
                        } else {
                            $rowValues[] = DB::connection()->getPdo()->quote($value);
                        }
                    }
                    $insertValues[] = "(" . implode(", ", $rowValues) . ")";
                }

                $sql .= implode(",\n", $insertValues) . ";\n\n";
            }
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        $filename = 'smartpos_backup_' . Carbon::now()->format('Y_m_d_His') . '.sql';

        return Response::make($sql, 200, [
            'Content-Type' => 'application/sql',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
