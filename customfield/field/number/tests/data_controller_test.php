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

namespace customfield_number;

use advanced_testcase;
use core_customfield_generator;
use core_customfield_test_instance_form;
use core_external\external_api;
use core_external\util;
use webservice;

defined('MOODLE_INTERNAL') || die();

global $CFG;

require_once($CFG->dirroot . '/webservice/lib.php');

/**
 * Tests for the data controller
 *
 * @package    customfield_number
 * @covers     \customfield_number\data_controller
 * @copyright  2024 Paul Holden <paulh@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class data_controller_test extends advanced_testcase {

    /**
     * Test that using base field controller returns our number type
     */
    public function test_create(): void {
        $this->resetAfterTest();
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course();

        /** @var core_customfield_generator $generator */
        $generator = $this->getDataGenerator()->get_plugin_generator('core_customfield');

        $category = $generator->create_category();
        $field = $generator->create_field(['categoryid' => $category->get('id'), 'type' => 'number']);
        $data = $generator->add_instance_data($field, (int) $course->id, 1);

        $this->assertInstanceOf(data_controller::class, \core_customfield\data_controller::create($data->get('id')));
        $this->assertInstanceOf(data_controller::class, \core_customfield\data_controller::create(0, $data->to_record()));
        $this->assertInstanceOf(data_controller::class, \core_customfield\data_controller::create(0, null, $field));
    }

    /**
     * Test validation of field instance form
     */
    public function test_form_validation(): void {
        global $CFG;

        require_once("{$CFG->dirroot}/customfield/tests/fixtures/test_instance_form.php");

        $this->resetAfterTest();
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course();

        /** @var core_customfield_generator $generator */
        $generator = $this->getDataGenerator()->get_plugin_generator('core_customfield');

        $category = $generator->create_category();
        $field = $generator->create_field(['categoryid' => $category->get('id'), 'type' => 'number', 'configdata' => [
            'minimumvalue' => 5,
            'maximumvalue' => 10,
        ]]);

        $data = \core_customfield\data_controller::create(0, null, $field);

        // Less than minimum value.
        $formdata = array_merge((array) $course, ['customfield_' . $field->get('shortname') => 2]);
        $this->assertEquals([
            'customfield_' . $field->get('shortname') => 'Value must be greater than or equal to 5',
        ], $data->instance_form_validation($formdata, []));

        // Greater than maximum value.
        $formdata = array_merge((array) $course, ['customfield_' . $field->get('shortname') => 12]);
        $this->assertEquals([
            'customfield_' . $field->get('shortname') => 'Value must be less than or equal to 10',
        ], $data->instance_form_validation($formdata, []));
    }

    /**
     * Test submitting field instance form
     */
    public function test_form_save(): void {
        global $CFG;

        require_once("{$CFG->dirroot}/customfield/tests/fixtures/test_instance_form.php");

        $this->resetAfterTest();
        $this->setAdminUser();

        $course = $this->getDataGenerator()->create_course();

        /** @var core_customfield_generator $generator */
        $generator = $this->getDataGenerator()->get_plugin_generator('core_customfield');

        $category = $generator->create_category();
        $field = $generator->create_field(['categoryid' => $category->get('id'), 'type' => 'number']);

        $formdata = array_merge((array) $course, ['customfield_' . $field->get('shortname') => 42]);
        core_customfield_test_instance_form::mock_submit($formdata);

        $form = new core_customfield_test_instance_form('POST', ['handler' => $category->get_handler(), 'instance' => $course]);
        $this->assertTrue($form->is_validated());

        $formsubmission = $form->get_data();
        $this->assertEquals(42.0, $formsubmission->{'customfield_' . $field->get('shortname')});
        $category->get_handler()->instance_form_save($formsubmission);
    }

    /**
     * Data provider for {@see test_export_value}
     *
     * @return array[]
     */
    public static function export_value_provider(): array {
        $template = '<span class="multilang" lang="en">$ %.02f</span><span class="multilang" lang="es">€ %.02f</span>';
        $whenzero = '<span class="multilang" lang="en">Unknown</span><span class="multilang" lang="es">Desconocido</span>';
        $whenempty = '<span class="multilang" lang="en">Free</span><span class="multilang" lang="es">Gratis</span>';
        return [
            'Export float value' => [42, 42.0, []],
            'Export value with a prefix' => [10, '$ 10.00', [
                'display' => $template,
                'displaywhenzero' => 0,
                'displaywhenempty' => ''],
            ],
            'Export value when zero' => [0, 'Unknown', [
                'display' => '%g',
                'displaywhenzero' => $whenzero,
                'displaywhenempty' => ''],
            ],
            'Export value when empty' => ['', 'Free', [
                'display' => '%g',
                'displaywhenzero' => 0,
                'displaywhenempty' => $whenempty],
            ],
        ];
    }

    /**
     * Test exporting instance
     *
     * @param float|string $datavalue
     * @param float|string $expectedvalue
     * @param array $configdata
     *
     * @dataProvider export_value_provider
     */
    public function test_export_value(
        float|string $datavalue,
        float|string $expectedvalue,
        array $configdata,
    ): void {
        $this->resetAfterTest();
        $this->setAdminUser();

        // Enable multilang filter.
        filter_set_global_state('multilang', TEXTFILTER_ON);
        filter_set_applies_to_strings('multilang', true);

        $course = $this->getDataGenerator()->create_course();

        /** @var core_customfield_generator $generator */
        $generator = $this->getDataGenerator()->get_plugin_generator('core_customfield');

        $category = $generator->create_category();
        $field = $generator->create_field([
            'categoryid' => $category->get('id'),
            'type' => 'number',
            'configdata' => $configdata,
        ]);
        $data = $generator->add_instance_data($field, (int) $course->id, $datavalue);

        $result = \core_customfield\data_controller::create($data->get('id'))->export_value();
        $this->assertEquals($expectedvalue, $result);

        // Let's test returned custom field via core_course_get_courses_by_field WS.
        $webservicemanager = new webservice;
        $service = $webservicemanager->get_external_service_by_shortname(MOODLE_OFFICIAL_MOBILE_SERVICE);
        $token = util::generate_token_for_current_user($service);
        $_POST['wstoken'] = $token->token;
        $_POST['sesskey'] = sesskey();

        $result = external_api::call_external_function('core_course_get_courses_by_field', [
            'field' => 'id',
            'value' => $course->id,
        ]);

        $this->assertFalse($result['error']);
        $customfield = $result['data']['courses'][0]['customfields'][0];

        $this->assertEquals($expectedvalue, $customfield['value']);
    }
}
