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

/**
 * Plugin language strings
 *
 * @package    customfield_number
 * @copyright  2024 Paul Holden <paulh@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die;

$string['decimalplaces'] = 'Decimal places';
$string['defaultvalueconfigerror'] = 'Default value must be between minimum and maximum';
$string['display'] = 'Display template';
$string['display_help'] = "<p>How to display the value of the field. Use the following placeholders:</p>
<ul>
<li>%g - display value in a general format</li>
<li>%d - display value as a decimal number</li>
<li>%.2f - display value as a floating-point number with 2 decimal places</li>
<li>%.4g - display value in a general format with 4 significant digits</li>
<li>%.2F - display as a floating-point number non-locale aware</li>
<li>%% - display a percent sign</li>
</ul>
<p>Examples of the templates:</p>
<ul>
<li><b>$ %.02f</b> - price in dollars</li>
<li><b>%g hrs</b> - duration in hours</li>
</ul>";
$string['displayvalueconfigerror'] = 'The placeholder is not invalid';
$string['displaywhenempty'] = 'Display when empty';
$string['displaywhenempty_help'] = "How to display the field value when no value has been specified.  Note that the value can never be empty if the default value is specified.<br>
Leave empty if you do not want to display anything at all in this case.";
$string['displaywhenzero'] = 'Display when zero';
$string['displaywhenzero_help'] = "How to display the field value when the value is \"0\".  For example, in case of a price you can display the word \"Free\" but in case of the duration you may want to leave it empty since it means that the duration was not estimated.<br>
Leave empty if you do not want to display anything at all when the value is set to \"0\".";
$string['headerdisplaysettings'] = 'Display format';
$string['maximumvalue'] = 'Maximum value';
$string['maximumvalueerror'] = 'Value must be less than or equal to {$a}';
$string['minimumvalue'] = 'Minimum value';
$string['minimumvalueconfigerror'] = 'Minimum value must be less than maximum';
$string['minimumvalueerror'] = 'Value must be greater than or equal to {$a}';
$string['pluginname'] = 'Number';
$string['privacy:metadata'] = 'The number custom field plugin does not store any personal data';
$string['specificsettings'] = 'Number field settings';
