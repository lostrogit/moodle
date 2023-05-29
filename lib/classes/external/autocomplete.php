<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

declare(strict_types=1);

namespace core\external;

use admin_externalpage;
use admin_settingpage;
use context_system;
use core_text;
use external_api;
use external_function_parameters;
use external_multiple_structure;
use external_single_structure;
use external_value;
use lang_string;
use moodle_url;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once("{$CFG->libdir}/externallib.php");
require_once($CFG->libdir.'/adminlib.php');

/**
 * External method for search using autocomplete.js
 *
 * @package     core
 * @copyright   2023 Carlos Castillo <carlos.castillo@moodle.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class autocomplete extends external_api {

    /**
     * External method parameters
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'query' => new external_value(PARAM_TEXT, 'String to search for'),
        ]);
    }

    /**
     * External method execution
     *
     * @param string $query
     * @return array
     */
    public static function execute(string $query): array {
        global $PAGE;
        $context = context_system::instance();
        $PAGE->set_context($context);
        [
            'query' => $query,
        ] = self::validate_parameters(self::execute_parameters(), [
            'query' => $query,
        ]);

        $searchdata[] = [
            'rooturl' => '',
            'title' => '',
            'url' => '',
            'settingname' => '',
            'settingvisiblename' => '',
            'settingdescription' => ''
        ];

        if (core_text::strlen($query) < 2) {
            return ['results' => $searchdata];
        }

        $query = core_text::strtolower($query);

        $adminroot = admin_get_root();
        $findings = $adminroot->search($query);
        $completeresulturl = new moodle_url('/admin/search.php', ['query' => $query]);
        $searchdata = [];
        foreach ($findings as $found) {
            $page     = $found->page;
            $settings = $found->settings;
            if ($page->is_hidden()) {
                // Hidden pages are not displayed in search results.
                continue;
            }

            $heading = highlight($query, $page->visiblename);
            $headingurl = null;
            if ($page instanceof admin_externalpage) {
                $headingurl = new moodle_url($page->url);
            } else if ($page instanceof admin_settingpage) {
                $headingurl = new moodle_url('/admin/settings.php', ['section' => $page->name]);
            } else {
                continue;
            }

            $settingvisiblename = '';

            if (!empty($settings)) {
                foreach ($settings as $setting) {
                    if (is_string($setting->visiblename)) {
                        $settingvisiblename = $setting->visiblename;
                    } else if ($setting->visiblename instanceof lang_string) {
                        $stringvisiblename = new lang_string($setting->visiblename->get_identifier(),
                            $setting->visiblename->get_component());
                        $settingvisiblename = $stringvisiblename->out();
                    }

                    $settingdescription = is_string($setting->description) ? $setting->description : $setting->description->out();
                    $headingurl->set_anchor('admin-'.$setting->name);
                    $newsetting = [
                        'rooturl' => $completeresulturl->out(false),
                        'title' => $heading,
                        'url' => $headingurl->out(false),
                        'settingname' => $setting->name,
                        'settingvisiblename' => $settingvisiblename,
                        'settingdescription' => $settingdescription,
                    ];
                    $searchdata[] = $newsetting;
                }
            }
        }

        return ['results' => $searchdata];
    }

    /**
     * External method return value
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'results' => new external_multiple_structure(new external_single_structure([
                'rooturl' => new external_value(PARAM_URL, 'The root search url'),
                'title' => new external_value(PARAM_CLEANHTML, 'The setting title'),
                'url' => new external_value(PARAM_URL, 'The setting url'),
                'settingname' => new external_value(PARAM_TEXT, 'The setting name'),
                'settingvisiblename' => new external_value(PARAM_TEXT, 'The setting visible name'),
                'settingdescription' => new external_value(PARAM_RAW, 'The setting description'),
            ]))
        ]);
    }
}
