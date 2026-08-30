<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\DatabaseSequenceService;

class SyncPostgresSequences extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:sync-sequences';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize PostgreSQL sequence counters to match current max IDs across all tables';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Synchronizing PostgreSQL sequences...');
        $results = DatabaseSequenceService::syncAll();

        foreach ($results as $result) {
            $this->line(" - $result");
        }

        $this->info('Sequences synchronization complete!');
        return Command::SUCCESS;
    }
}
