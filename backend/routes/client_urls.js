const express = require('express');
const router = express.Router();
const { 
  get_clients, create_client, get_client_detail, update_client, delete_client 
} = require('../controllers/client_controller');
const { 
  get_client_projects, create_client_project, get_project_detail, update_project, delete_project, get_all_projects 
} = require('../controllers/project_controller');

const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');

router.route('/')
  .get(is_authenticated, get_clients)
  .post(is_authenticated, is_manager_or_above, create_client); // ← is_authenticated add kiya

router.get('/projects/', is_authenticated, get_all_projects);

router.route('/:pk/')
  .get(is_authenticated, get_client_detail)
  .put(is_authenticated, is_manager_or_above, update_client)     // ← fixed
  .patch(is_authenticated, is_manager_or_above, update_client)   // ← fixed
  .delete(is_authenticated, is_manager_or_above, delete_client); // ← fixed

router.route('/:client_pk/projects/')
  .get(is_authenticated, get_client_projects)
  .post(is_authenticated, is_manager_or_above, create_client_project); // ← fixed

router.route('/:client_pk/projects/:pk/')
  .get(is_authenticated, get_project_detail)
  .put(is_authenticated, is_manager_or_above, update_project)    // ← fixed
  .patch(is_authenticated, is_manager_or_above, update_project)  // ← fixed
  .delete(is_authenticated, is_manager_or_above, delete_project); // ← fixed

module.exports = router;