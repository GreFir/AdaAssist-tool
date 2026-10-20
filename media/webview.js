(function () {
  const vscode = acquireVsCodeApi();
  const persistedWebviewState = vscode.getState() || {};
  let uiLanguage = persistedWebviewState.uiLanguage === 'zh-CN' ? 'zh-CN' : 'en';

  const translations = {
    en: {
      inlineSettingsUnsaved: 'Unsaved changes — save to apply.',
      inlineSettingsSaved: 'Inline completion settings saved.',
      inlineSettingsFailed: 'Unable to save inline settings.',
      composerMode: 'Task mode', composerModeLocked: 'Mode is locked for this task. Choose New Task to change it.',
      modelTab: 'Models', completionTab: 'Completion',
      profileEndpointRequired: 'This provider requires a Base URL.',
      keyOptionalHint: 'Optional for local vLLM and Ollama servers.',
      environmentTab: 'Environment',
      workflowSettingsTitle: 'Task execution',
      workflowSettingsDescription: 'Set the next task’s behavior. A running task keeps its existing mode.',
      workflowModeDescription: 'Choose whether to pause for review or run automatically.',
      contextSettingDescription: 'Reuse prior generation and test feedback within the current task.',
      workflowModelGroup: 'Model used for tasks',
      workflowModelDescription: 'Connection details and output limits are managed in Models.',
      configureModel: 'Configure model',
      modelSettingsTitle: 'Model profiles',
      modelSettingsDescription: 'Connections, credentials, and output budgets saved for each model.',
      chooseProfile: 'Choose a profile',
      connectionSection: 'Connection',
      connectionSectionHint: 'Specify the model endpoint and credentials for workflow requests.',
      endpointOptionalHint: 'Optional for OpenAI and Claude official endpoints.',
      generationSection: 'Generation budget',
      discardChanges: 'Discard changes',
      advancedProfileActions: 'Advanced profile actions',
      completionSettingsTitle: 'Inline completion',
      completionEnableHint: 'Suggest code while editing Python files.',
      completionModelSection: 'Completion model',
      completionModelHint: 'Independent from the model selected for coding tasks.',
      completionBehaviorSection: 'Trigger and limits',
      completionLimitHint: 'Debounce applies only to automatic requests. This budget only affects inline suggestions.',
      environmentSettingsTitle: 'Python runtime',
      environmentSettingsDescription: 'Interpreter and dependency checks for the local AdaAssist backend.',
      profileUnsaved: 'Unsaved profile changes — save or discard before switching profiles.',
      profileReady: 'Changes apply when you save. Credentials remain in VS Code Secret Storage.',
      profileSavedStatus: 'Profile saved successfully.',
      profileSavingStatus: 'Saving profile…',
      profileChangesBlocked: 'Save or discard the current changes before switching profiles.',
      profileRequired: 'Profile name and model ID are required.',
      profileEndpointRequired: 'This provider needs a Base URL.',
      profileKeyRequired: 'Enter an API key or configure the associated environment variable.',
      profileSaveError: 'Profile was not saved.',
      workflow: 'Workflow', logs: 'Logs', tests: 'Tests', profiles: 'Profiles', runtime: 'Runtime', settings: 'Settings', settingsHint: 'Manage workflows, models, inline completion and the Python runtime.', openLogs: 'Open Logs', openTests: 'Open Tests', openProfiles: 'Open Profiles', openSettings: 'Open Settings',
      workflowSetup: 'Workflow setup', runSetup: 'Run Setup', mode: 'Mode', workflowMode: 'Workflow Mode', interactiveContinue: 'Interactive Continue', autoFullWorkflow: 'Auto Full Workflow',
      environmentStatus: 'Environment Status', checkingEnvironment: 'Checking environment...', environmentReady: 'Environment ready', environmentWarning: 'Environment needs attention', environmentFailed: 'Environment unavailable', checkEnvironment: 'Check Environment',
      interactiveHint: 'Interactive pauses at review points so you can edit tests, code, plans, and add directions before the next model call.', autoHint: 'Auto runs the complete backend workflow without mid-step editing or guidance.', llmProfile: 'LLM Profile', configure: 'Configure', startupContext: 'Startup Context',
      llmSetupRequired: 'LLM Setup Required', configureProfileBeforeStart: 'Configure an LLM profile before starting the workflow.', conversation: 'Conversation',
      conversationHint: 'Requirements, code, run results, and plans appear here in order.', problemPlaceholder: 'Describe the coding task, constraints, expected behavior, and anything the model must preserve.',
      selectionToPrompt: 'Use Selection', send: 'Send', sendWorkflow: 'Send workflow', newTask: 'New Task', composerNote: 'Ctrl/Cmd+Enter to send.', modelSelectHint: 'Choose a model from your profile config.', modelLockedHint: 'Click New Task to switch models.',
      closeTests: 'Close tests', testsCompactEmpty: 'Leave empty to generate tests.', testsCompactDirty: 'Unsaved changes · save or continue to apply.', testsCompactReady: 'Edit the tests, then save or continue.', testsHint: 'Keep one shared Python assert test suite for the current workflow.', back: 'Back', testSuite: 'Test Suite', testMode: 'Test Mode', manualTests: 'Manual Tests', generateTests: 'Generate Tests', testOptions: 'Generation options', testGenerationGoal: 'Test generation goal', replaceWithSelection: 'Replace with selection', collapseTests: 'Done',
      manualTestsHint: 'This is the single current test suite. Leave it empty to generate tests before code generation.', selectionToTests: 'Selection To Tests', saveTests: 'Save Tests',
      generatedTestSuite: 'Generated Test Suite', generatedTestsHint: 'Switch to generated tests mode to work with a separate editable test suite.', profileSettings: 'Profile Settings',
      profileSettingsHint: 'Manage OpenAI-compatible, Claude, Ollama, or vLLM profiles. Use the selector to edit an existing profile or start a new draft; the workflow page keeps using the active profile until you save.',
      profile: 'Profile', profileName: 'Profile Name', workflowMaxTokens: 'Max Output Tokens', workflowMaxTokensHint: 'Maximum output tokens for code, tests, and repair plans. Updates the current idle session when the model is unchanged.', provider: 'Provider', baseUrl: 'Base URL', model: 'Model', apiKey: 'API Key', apiKeyHint: 'Optional for Ollama and vLLM. Required for hosted providers.',
      profileEditorHint: 'Create a new profile draft or edit an existing profile.', newProfile: 'New Profile', openConfig: 'Open Config', reloadProfiles: 'Reload Profiles', deleteProfile: 'Delete Profile', saveProfile: 'Save Profile',
      pythonInterpreter: 'Python Interpreter', pythonInterpreterHint: 'Choose the Python environment used to start AdaAssist\'s local backend.', selectPythonInterpreter: 'Select Python Interpreter', autoDetectPython: 'Auto-detect Python',
      inlineCompletion: 'Inline Completion', inlineCompletionHint: 'These settings control gray Python suggestions and are separate from the workflow profile.', inlineCompletionEnabled: 'Enable inline completion', triggerMode: 'Trigger', automaticTrigger: 'Automatic', manualTrigger: 'Manual', debounceMs: 'Debounce (ms)', maxTokens: 'Max tokens', saveInlineCompletion: 'Save inline settings',
      testInputPlaceholder: 'Type or paste Python assert tests…', resolvedTestsPlaceholder: 'Generated assert tests appear here. Edit directly in this Python block.',
      noProfile: 'No profile', interactive: 'interactive', auto: 'auto', setupNeeded: 'setup needed', contextOn: 'context on', contextOff: 'context off', testsConfigured: 'Tests configured', autoGenerateTests: 'Auto-generate tests',
      continue: 'Continue', stop: 'Stop', stopping: 'Stopping', continueWorkflow: 'Continue workflow', stopWorkflow: 'Stop workflow',
      running: 'Running...', stoppingAfterStage: 'Stopping after the current stage...', workflowPaused: 'Workflow paused. Use Continue to proceed.', runPassed: 'Run passed. Review the latest result in the conversation or insert the generated code.',
      pausedOnPlan: 'Paused on the latest plan. Edit it, regenerate it, or move to the next step when ready.', testsWaiting: 'Tests are waiting for setup review. Edit them, generate them, or continue when ready.', testsReadyPrompt: 'The task tests are ready and kept collapsed. Continue to use them, or review and edit them first.', testsGeneratedPrompt: 'No tests were provided, so I generated a test suite. Review it if needed, then continue.', reviewTests: 'Review tests',
      codeReady: 'Generated code is ready for its first test run. Resume to continue.', resultWaiting: 'The latest result is waiting for your choice: next step, restart, or end here.',
      interactiveControlled: 'Use the actions below the latest response to continue.', runFailed: 'The latest run failed. Review the newest result in the conversation.',
      leaveTestsEmpty: 'Leave the tests box empty to generate tests before code generation.', testsLocallyEdited: 'Current tests have local edits. Continue or save to use them for evaluation.', singleTestsEditor: 'This is the single Tests editor for the workflow.',
      noConversation: 'No conversation yet. Send a prompt to begin.', createNewProfile: 'Create New Profile', newProfileName: 'New Profile', newProfileHint: 'Creating a new profile draft. The active workflow profile stays unchanged until you save it.',
      profileNotFound: 'Selected profile not found. Start a new draft or reload the profile list.', keepStoredKey: 'Leave blank to keep the stored key', keyStored: 'API key is stored securely. Leave the field blank to keep it, or enter a new key to replace it.',
      keyEmpty: 'API key is empty for this profile. You can save one here, or set apiKeyEnv in the profile config file.', requirement: 'Requirement', code: 'Code', runResult: 'Run Result', plan: 'Plan', session: 'Session', note: 'Note', noPlan: 'No plan content yet.', openCode: 'Open code', editTests: 'Edit tests', insertCode: 'Insert code', retestCode: 'Run tests again',
      sessionInitialized: 'Session Initialized', context: 'Context', enabled: 'enabled', disabled: 'disabled', editRequirement: 'Edit the requirement before code generation. This draft syncs with the prompt box below.',
      nextStep: 'Next Step', restartFromPrompt: 'Restart From Prompt', restartAction: 'Restart', endHere: 'End Here', doneAction: 'Done', insertLatestCode: 'Insert Latest Code', languageToggleTitle: 'Switch to Chinese',
      additionalInstructionPlaceholder: 'Add guidance for future plan, test, and code generation. This does not replace the original requirement.', runningInputPlaceholder: 'A request is running. You can add guidance after it finishes.', testsInputPlaceholder: 'Add guidance for future tests and code. Edit test cases in the test editor; this does not replace the requirement.', planInputPlaceholder: 'Add guidance for the next code generation using this plan. To change the plan itself, edit its card; this does not replace the requirement.', failureInputPlaceholder: 'Describe the correction or direction for the next repair plan and code generation; this does not replace the requirement.', codeInputPlaceholder: 'Add constraints or corrections for future generation. This does not directly edit the current code or replace the requirement.', savedGuidance: 'Guidance saved · applies to future generation', savedRequirement: 'Requirement updated', savedPlan: 'Plan saved · required for subsequent code generation', savedTestGoals: 'Test generation goals saved', autoLockedPlaceholder: 'Auto mode runs without mid-workflow guidance. Start a new task to change the requirement.', addInstruction: 'Send update', autoModeLocked: 'Auto',
      testDescriptionPlaceholder: 'Optional: describe the cases, constraints, or testing goals the generated tests should cover.',
      selectionAppended: 'Editor selection appended.', selectionReplaced: 'Tests replaced from editor selection.',
      generatingTestsStatus: 'Generating tests…', generatedTestsStatus: 'Tests generated. Review and save them before continuing.',
      savingTestsStatus: 'Saving tests…', savedTestsStatus: 'Tests saved.', sendingInstructionStatus: 'Sending update…', instructionAddedStatus: 'Instruction saved for the next generated plan, tests, or code.',
      workflowUpdatedStatus: 'Workflow updated.', operationFailed: 'Operation failed', retry: 'Retry', dismiss: 'Dismiss', studyTask: 'User study task', studyIntro: 'Choose a task and a workflow mode, then start with the fixed public tests.', studyMode: 'Workflow mode', loadStudyTask: 'Load task', startStudyTask: 'Start workflow', workflowProgress: 'Workflow progress', noWorkflowHistory: 'No workflow history yet.',
      copyCode: 'Copy code', copied: 'Copied', copyFailed: 'Copy failed', logViewer: 'Logs', logViewerHint: 'Browse saved workflow, model, evaluation, and interaction events across sessions.', refreshLogs: 'Refresh', openOutput: 'Open VS Code Output', noLogs: 'No saved log history yet.', logDetails: 'Details', localLog: 'Extension', workflowLog: 'Workflow', logModel: 'Model', logEvaluation: 'Evaluation', logInteraction: 'Interaction', logSession: 'Session', currentLogSession: 'Current', logEvents: 'events', unscopedLogs: 'General extension logs'
    },
    'zh-CN': {
      inlineSettingsUnsaved: '修改尚未保存，请点击保存应用。',
      inlineSettingsSaved: '行内补全设置已保存。',
      inlineSettingsFailed: '行内补全设置保存失败。',
      composerMode: '任务模式', composerModeLocked: '当前任务的模式已锁定，创建新任务后可切换。',
      modelTab: '模型', completionTab: '补全',
      profileEndpointRequired: '当前服务类型需要填写 Base URL。',
      keyOptionalHint: '本地 vLLM 和 Ollama 通常不需要 API Key。',
      environmentTab: '运行环境',
      workflowSettingsTitle: '任务执行',
      workflowSettingsDescription: '这些选项用于下一个任务；运行中的任务保留原有执行模式。',
      workflowModeDescription: '选择需要人工审查的交互模式，或自动完成整个工作流。',
      contextSettingDescription: '在当前任务内部复用生成与测试反馈，不跨独立任务传递。',
      workflowModelGroup: '任务使用的模型',
      workflowModelDescription: '模型连接、凭据和输出长度统一在“模型”中管理。',
      configureModel: '配置模型',
      modelSettingsTitle: '模型配置',
      modelSettingsDescription: '每个模型独立保存连接信息、凭据与生成预算。',
      chooseProfile: '选择配置',
      connectionSection: '模型连接',
      connectionSectionHint: '用于生成代码、测试和修复计划的模型连接。',
      endpointOptionalHint: 'OpenAI 和 Claude 使用官方接口时可留空。',
      generationSection: '生成预算',
      discardChanges: '放弃修改',
      advancedProfileActions: '高级管理',
      completionSettingsTitle: '行内代码补全',
      completionEnableHint: '在编辑 Python 代码时生成行内建议。',
      completionModelSection: '补全模型',
      completionModelHint: '与主工作流使用的模型独立配置。',
      completionBehaviorSection: '触发方式与限制',
      completionLimitHint: '防抖仅在自动触发时生效，此处 Token 上限只影响行内补全。',
      environmentSettingsTitle: 'Python 运行环境',
      environmentSettingsDescription: '管理 AdaAssist 本地后端的 Python 解释器与依赖检查。',
      profileUnsaved: '配置有未保存的修改，请先保存或放弃修改后再切换。',
      profileReady: '点击保存后才会应用修改，密钥保存在 VS Code 安全存储中。',
      profileSavedStatus: '模型配置已保存。',
      profileSavingStatus: '正在保存配置…',
      profileChangesBlocked: '请先保存或放弃当前配置的修改，再切换其他模型。',
      profileRequired: '请输入配置名称和模型 ID。',
      profileEndpointRequired: '当前服务类型必须配置 Base URL。',
      profileKeyRequired: '请填写 API Key 或在配置文件中设置密钥环境变量。',
      profileSaveError: '模型配置未保存。',
      closeTests: '关闭测试', testsCompactEmpty: '留空可自动生成测试。', testsCompactDirty: '有未保存修改 · 保存或继续以应用。', testsCompactReady: '编辑后保存，或继续工作流。',
      workflow: '工作流', logs: '日志', tests: '测试', profiles: '配置', runtime: '运行环境', settings: '设置', settingsHint: '分别管理工作流、模型、行内补全和 Python 运行环境。', openLogs: '打开日志', openTests: '打开测试', openProfiles: '打开配置', openSettings: '打开设置',
      workflowSetup: '工作流设置', runSetup: '运行设置', mode: '模式', workflowMode: '工作流模式', interactiveContinue: '交互式继续', autoFullWorkflow: '自动完整工作流',
      environmentStatus: '环境状态', checkingEnvironment: '正在检查环境...', environmentReady: '环境已就绪', environmentWarning: '环境需要注意', environmentFailed: '环境不可用', checkEnvironment: '检查环境',
      interactiveHint: 'Interactive 会在审查点暂停，你可以修改测试、代码和计划，并在下一次模型调用前补充方向。', autoHint: 'Auto 会连续运行完整后端流程，不开放中途编辑或补充指导。', llmProfile: 'LLM 配置', configure: '配置', startupContext: '启动上下文',
      llmSetupRequired: '需要配置 LLM', configureProfileBeforeStart: '请先配置一个 LLM 配置，再启动工作流。', conversation: '对话',
      conversationHint: '需求、代码、运行结果和计划会按顺序显示在这里。', problemPlaceholder: '描述编程任务、约束条件、预期行为，以及模型必须保留的内容。',
      selectionToPrompt: '使用选区', send: '发送', sendWorkflow: '发送工作流', newTask: '新任务', composerNote: '按 Ctrl/Cmd+Enter 发送。', modelSelectHint: '从配置文件列表中选择模型。', modelLockedHint: '点击“新任务”后可切换模型。',
      testsHint: '为当前工作流维护一套共享的 Python assert 测试。', back: '返回', testSuite: '测试集', testMode: '测试模式', manualTests: '手动测试', generateTests: '生成测试', testOptions: '生成选项', testGenerationGoal: '测试生成目标', replaceWithSelection: '用选区替换', collapseTests: '完成',
      manualTestsHint: '这是当前唯一的测试集。留空可在生成代码前自动生成测试。', selectionToTests: '选区写入测试', saveTests: '保存测试',
      generatedTestSuite: '已生成的测试集', generatedTestsHint: '切换到生成测试模式，可使用独立且可编辑的测试集。', profileSettings: '配置设置',
      profileSettingsHint: '管理 OpenAI 兼容、Claude、Ollama 或 vLLM 配置。可选择已有配置编辑，或新建草稿；保存前工作流仍使用当前活动配置。',
      profile: '配置', profileName: '配置名称', workflowMaxTokens: '最大输出 Tokens', workflowMaxTokensHint: '控制代码生成、测试生成和修复规划的最大输出 Tokens；模型不变时，也会更新当前空闲 Session。', provider: '提供方', baseUrl: '基础 URL', model: '模型', apiKey: 'API 密钥', apiKeyHint: 'Ollama 和 vLLM 可不填；托管服务提供方需要填写。',
      profileEditorHint: '新建配置草稿，或编辑已有配置。', newProfile: '新建配置', openConfig: '打开配置文件', reloadProfiles: '重新加载配置', deleteProfile: '删除配置', saveProfile: '保存配置',
      pythonInterpreter: 'Python 解释器', pythonInterpreterHint: '选择用于启动 AdaAssist 本地后端的 Python 环境。', selectPythonInterpreter: '选择 Python 解释器', autoDetectPython: '自动检测 Python',
      inlineCompletion: '行内代码补全', inlineCompletionHint: '这里的配置控制 Python 编辑器中的灰色补全，与工作流 LLM 配置相互独立。', inlineCompletionEnabled: '启用行内代码补全', triggerMode: '触发方式', automaticTrigger: '自动触发', manualTrigger: '手动触发', debounceMs: '防抖延迟（毫秒）', maxTokens: '最大生成 token', saveInlineCompletion: '保存行内配置',
      testInputPlaceholder: '输入或粘贴 Python assert 测试…', resolvedTestsPlaceholder: '生成的 assert 测试会显示在这里。可直接在此 Python 代码块中编辑。',
      noProfile: '未选择配置', interactive: '交互', auto: '自动', setupNeeded: '需要设置', contextOn: '上下文开启', contextOff: '上下文关闭', testsConfigured: '已配置测试', autoGenerateTests: '自动生成测试',
      continue: '继续', stop: '停止', stopping: '正在停止', continueWorkflow: '继续工作流', stopWorkflow: '停止工作流',
      running: '正在运行...', stoppingAfterStage: '将在当前阶段结束后停止...', workflowPaused: '工作流已暂停。点击“继续”以推进。', runPassed: '运行已通过。请在对话中查看最新结果，或插入生成的代码。',
      pausedOnPlan: '工作流暂停在最新计划。可编辑、重新生成计划，或在准备好后进入下一步。', testsWaiting: '测试正在等待审查。可编辑、生成测试，或在准备好后继续。', testsReadyPrompt: '题目测试已经填充并保持折叠。可以直接继续，也可以先查看和修改。', testsGeneratedPrompt: '当前没有提供测试，因此我已经生成了一套测试。需要时可以先查看和修改，然后继续。', reviewTests: '查看测试',
      codeReady: '生成的代码已可进行首次测试。点击继续以推进。', resultWaiting: '最新结果正在等待你的选择：下一步、从需求重启或在此结束。',
      interactiveControlled: '请使用最新回复下方的操作继续。', runFailed: '最新运行失败。请在对话中查看最新结果。',
      leaveTestsEmpty: '测试框留空可在生成代码前自动生成测试。', testsLocallyEdited: '当前测试已有本地修改。继续或保存后将使用它们进行评估。', singleTestsEditor: '这是该工作流唯一的测试编辑器。',
      noConversation: '暂无对话。发送需求以开始。', createNewProfile: '新建配置', newProfileName: '新建配置', newProfileHint: '正在新建配置草稿。保存前，活动工作流配置不会改变。',
      profileNotFound: '未找到所选配置。请新建草稿或重新加载配置列表。', keepStoredKey: '留空以保留已存储的密钥', keyStored: 'API 密钥已安全存储。留空可保留原密钥，填写新值可替换它。',
      keyEmpty: '此配置没有 API 密钥。可在这里保存密钥，或在配置文件中设置 apiKeyEnv。', requirement: '需求', code: '代码', runResult: '运行结果', plan: '计划', session: '会话', note: '说明', noPlan: '暂无计划内容。', openCode: '打开代码', editTests: '编辑测试', insertCode: '插入代码', retestCode: '重新运行测试',
      sessionInitialized: '会话已初始化', context: '上下文', enabled: '开启', disabled: '关闭', editRequirement: '可在生成代码前编辑需求。此草稿会同步到下方的需求输入框。',
      nextStep: '下一步', restartFromPrompt: '从需求重新开始', restartAction: '重新开始', endHere: '在此结束', doneAction: '结束', insertLatestCode: '插入最新代码', languageToggleTitle: '切换为英文',
      additionalInstructionPlaceholder: '补充后续计划、测试和代码生成的约束或方向；不会替换原始需求。', runningInputPlaceholder: '正在处理请求，完成后可补充指导。', testsInputPlaceholder: '补充后续测试和代码生成的指导；测试用例请在测试编辑器中修改，不会替换原始需求。', planInputPlaceholder: '补充按当前计划生成代码的方向；要修改计划正文，请编辑计划卡片，不会替换原始需求。', failureInputPlaceholder: '说明下一次修复计划和代码生成的纠正方向或约束；不会替换原始需求。', codeInputPlaceholder: '补充后续生成的约束或纠正方向；不会直接修改当前代码，也不会替换原始需求。', savedGuidance: '补充指导已保存 · 用于后续生成', savedRequirement: '需求已更新', savedPlan: '计划已保存 · 后续代码生成将按此执行', savedTestGoals: '测试生成目标已保存', autoLockedPlaceholder: 'Auto 模式不接受中途指导；如需修改需求，请新建任务。', addInstruction: '发送补充要求', autoModeLocked: 'Auto',
      testDescriptionPlaceholder: '可选：说明自动测试需要覆盖的场景、约束或测试目标。',
      selectionAppended: '已追加编辑器选区。', selectionReplaced: '已用编辑器选区替换测试。',
      generatingTestsStatus: '正在生成测试…', generatedTestsStatus: '测试已生成，请检查并保存后继续。',
      savingTestsStatus: '正在保存测试…', savedTestsStatus: '测试已保存。', sendingInstructionStatus: '正在发送补充要求…', instructionAddedStatus: '补充要求已保存，将用于下一次生成计划、测试或代码。',
      workflowUpdatedStatus: '工作流已更新。', operationFailed: '操作失败', retry: '重试', dismiss: '关闭', studyTask: '用户研究任务', studyIntro: '选择任务和工作流模式，然后使用固定公开测试开始。', studyMode: '工作流模式', loadStudyTask: '载入任务', startStudyTask: '开始工作流', workflowProgress: '工作流进度', noWorkflowHistory: '暂无工作流历史。',
      copyCode: '复制代码', copied: '已复制', copyFailed: '复制失败', logViewer: '日志', logViewerHint: '浏览跨会话保存的工作流、模型、评测和用户交互记录。', refreshLogs: '刷新', openOutput: '打开 VS Code 输出', noLogs: '暂无已保存的日志历史。', logDetails: '详情', localLog: '扩展', workflowLog: '工作流', logModel: '模型', logEvaluation: '评测', logInteraction: '用户交互', logSession: '会话', currentLogSession: '当前', logEvents: '条事件', unscopedLogs: '通用扩展日志'
    }
  };

  function t(key) {
    return (translations[uiLanguage] && translations[uiLanguage][key]) || translations.en[key] || key;
  }

  function applyTranslations() {
    document.documentElement.lang = uiLanguage;
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (element) {
      element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (element) {
      element.setAttribute('title', t(element.dataset.i18nTitle));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (element) {
      element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });
    const toggle = document.getElementById('languageToggleBtn');
    if (toggle) {
      toggle.textContent = uiLanguage === 'zh-CN' ? '中' : 'EN';
      toggle.title = t('languageToggleTitle');
      toggle.setAttribute('aria-label', toggle.title);
    }
  }

  const taskPage = document.getElementById('taskPage');
  const testsPage = document.getElementById('testsPage');
  const settingsPage = document.getElementById('settingsPage');
  const logsPage = document.getElementById('logsPage');
  const showOutputBtn = document.getElementById('showOutputBtn');
  const openTestsBtn = document.getElementById('openTestsBtn');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
	const settingsTabButtons = Array.from(document.querySelectorAll('[data-settings-tab]'));
	const settingsTabPanels = Array.from(document.querySelectorAll('[data-settings-panel]'));
  const editProfileFromSetupBtn = document.getElementById('editProfileFromSetupBtn');
  const backFromTestsBtn = document.getElementById('backFromTestsBtn');
  const backToWorkflowBtn = document.getElementById('backToWorkflowBtn');
  const backFromLogsBtn = document.getElementById('backFromLogsBtn');
  const refreshLogsBtn = document.getElementById('refreshLogsBtn');
  const openRawOutputBtn = document.getElementById('openRawOutputBtn');
  const visualLogList = document.getElementById('visualLogList');
  const submitWorkflowIcon = document.getElementById('submitWorkflowIcon');
  const submitWorkflowLabel = document.getElementById('submitWorkflowLabel');
  const sendIconSrc = document.body ? String(document.body.dataset.sendIcon || '') : '';
  const continueIconSrc = document.body ? String(document.body.dataset.continueIcon || '') : '';
  const stopIconSrc = document.body ? String(document.body.dataset.stopIcon || '') : '';

  const taskProfileSelect = document.getElementById('taskProfileSelect');
  const modelPicker = document.getElementById('composerModelPicker');
  const modelPickerButton = document.getElementById('modelPickerButton');
  const modelPickerLabel = document.getElementById('modelPickerLabel');
  const modelPickerMenu = document.getElementById('modelPickerMenu');

  function closeModelPicker(restoreFocus) {
    modelPickerMenu.hidden = true;
    modelPickerButton.setAttribute('aria-expanded', 'false');
    if (restoreFocus) modelPickerButton.focus();
  }

  function openModelPicker(last) {
    if (modelPickerButton.disabled) return;
    modelPickerMenu.hidden = false;
    modelPickerButton.setAttribute('aria-expanded', 'true');
    const items = Array.from(modelPickerMenu.children);
    const selected = items.find(item => item.getAttribute('aria-checked') === 'true');
    const target = last ? items[items.length - 1] : selected || items[0];
    if (target) target.focus();
  }

  function renderModelPicker() {
    const focusedId = modelPickerMenu.contains(document.activeElement) ? document.activeElement.dataset.profileId : '';
    modelPickerMenu.replaceChildren();
    state.profiles.forEach(profile => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'model-picker-option';
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(profile.id === taskProfileSelect.value));
      item.tabIndex = -1;
      item.dataset.profileId = profile.id;
      const name = document.createElement('span');
      name.className = 'model-picker-option-name';
      name.textContent = profile.name;
      item.title = profile.name;
      const check = document.createElement('span');
      check.className = 'model-picker-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = profile.id === taskProfileSelect.value ? '✓' : '';
      item.append(name, check);
      item.addEventListener('click', () => {
        if (modelPickerButton.disabled) return;
        taskProfileSelect.value = profile.id;
        taskProfileSelect.dispatchEvent(new Event('change'));
        closeModelPicker(true);
      });
      modelPickerMenu.appendChild(item);
      if (focusedId === profile.id && !modelPickerMenu.hidden) item.focus();
    });
    modelPickerLabel.textContent = selectedProfile()?.name || t('noProfile');
    modelPickerButton.setAttribute('aria-label', t('model') + ': ' + modelPickerLabel.textContent);
  }

  modelPickerButton.addEventListener('click', () => {
    if (modelPickerMenu.hidden) openModelPicker(false);
    else closeModelPicker(false);
  });
  modelPickerButton.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openModelPicker(event.key === 'ArrowUp');
    }
  });
  modelPickerMenu.addEventListener('keydown', event => {
    const items = Array.from(modelPickerMenu.children);
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      items[next]?.focus();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModelPicker(true);
    }
    if (event.key === 'Tab') closeModelPicker(true);
  });
  document.addEventListener('pointerdown', event => {
    if (!modelPicker.contains(event.target)) closeModelPicker(false);
  });
  modelPicker.addEventListener('focusout', event => {
    if (!modelPicker.contains(event.relatedTarget)) closeModelPicker(false);
  });
  const settingsProfileSelect = document.getElementById('settingsProfileSelect');
  const problemInput = document.getElementById('problemInput');
  const testInput = document.getElementById('testInput');
  const testModeSelect = document.getElementById('testModeSelect');
  const modelSummary = document.getElementById('modelSummary');
  const testsSummary = document.getElementById('testsSummary');
  const executionModeSelect = document.getElementById('executionModeSelect');
  const composerModeRow = document.getElementById('composerModeRow');
  const composerInteractiveModeBtn = document.getElementById('composerInteractiveModeBtn');
  const composerAutoModeBtn = document.getElementById('composerAutoModeBtn');
  const workflowModeHint = document.getElementById('workflowModeHint');
  const contextEnabledInput = document.getElementById('contextEnabledInput');
  const profileNotice = document.getElementById('profileNotice');
  const profileNoticeText = document.getElementById('profileNoticeText');
  const profileNoticeBtn = document.getElementById('profileNoticeBtn');
	const environmentStatus = document.getElementById('environmentStatus');
	const environmentStatusSummary = document.getElementById('environmentStatusSummary');
	const environmentCheckList = document.getElementById('environmentCheckList');
	const checkEnvironmentBtn = document.getElementById('checkEnvironmentBtn');
	const pythonInterpreterValue = document.getElementById('pythonInterpreterValue');
	const selectPythonInterpreterBtn = document.getElementById('selectPythonInterpreterBtn');
  const inlineCompletionEnabledInput = document.getElementById('inlineCompletionEnabledInput');
  const inlineCompletionProviderSelect = document.getElementById('inlineCompletionProviderSelect');
  const inlineCompletionTriggerModeSelect = document.getElementById('inlineCompletionTriggerModeSelect');
  const inlineCompletionBaseUrlInput = document.getElementById('inlineCompletionBaseUrlInput');
  const inlineCompletionModelInput = document.getElementById('inlineCompletionModelInput');
  const inlineCompletionDebounceInput = document.getElementById('inlineCompletionDebounceInput');
  const inlineCompletionMaxTokensInput = document.getElementById('inlineCompletionMaxTokensInput');
  const saveInlineCompletionBtn = document.getElementById('saveInlineCompletionBtn');
  const inlineCompletionStatus = document.getElementById('inlineCompletionStatus');
  const composerStatus = document.getElementById('composerStatus');
  const workflowProgress = document.getElementById('workflowProgress');
  const workflowProgressToggle = document.getElementById('workflowProgressToggle');
  const workflowProgressPopover = document.getElementById('workflowProgressPopover');
  const workflowProgressList = document.getElementById('workflowProgressList');
  const workflowProgressCurrentTitle = document.getElementById('workflowProgressCurrentTitle');
  const workflowProgressCurrentDetail = document.getElementById('workflowProgressCurrentDetail');
  const workflowProgressMarker = document.getElementById('workflowProgressMarker');
  const conversationScroll = document.getElementById('conversationScroll');
  const timeline = document.getElementById('timeline');
  const testsDrawer = document.getElementById('testsDrawer');
  const testsDrawerToggleBtn = document.getElementById('testsDrawerToggleBtn');
  const closeTestsDrawerBtn = document.getElementById('closeTestsDrawerBtn');
  const testDescription = document.getElementById('testDescription');
  const testsSaveResult = document.getElementById('testsSaveResult');
  const operationState = document.getElementById('operationState');
  const workflowError = document.getElementById('workflowError');

  const manualTestsSection = document.getElementById('manualTestsSection');
  const testSettingsDetails = document.getElementById('testSettingsDetails');
  const testsWorkspaceSection = document.getElementById('testsWorkspaceSection');
  const resolvedTestsHint = document.getElementById('resolvedTestsHint');
  const resolvedTestsEditor = document.getElementById('resolvedTestsEditor');
  const generateTestsBtn = document.getElementById('generateTestsBtn');
  const saveResolvedTestsBtn = document.getElementById('saveResolvedTestsBtn');

  const useSelectionForProblemBtn = document.getElementById('useSelectionForProblemBtn');
  const useSelectionForTestsBtn = document.getElementById('useSelectionForTestsBtn');
  const replaceSelectionForTestsBtn = document.getElementById('replaceSelectionForTestsBtn');
  const clearSessionBtn = document.getElementById('clearSessionBtn');
  const submitWorkflowBtn = document.getElementById('submitWorkflowBtn');

  const profileNameInput = document.getElementById('profileNameInput');
  const profileBaseUrlInput = document.getElementById('profileBaseUrlInput');
  const profileModelInput = document.getElementById('profileModelInput');
  const workflowModelSummary = document.getElementById('workflowModelSummary');
  const profileEditStatus = document.getElementById('profileEditStatus');
  const discardProfileChangesBtn = document.getElementById('discardProfileChangesBtn');
  const profileEndpointHint = document.getElementById('profileEndpointHint');
  const profileKeyHint = document.getElementById('profileKeyHint');
  const completionServiceGroup = document.getElementById('completionServiceGroup');
  const completionBehaviorGroup = document.getElementById('completionBehaviorGroup');
  const profileMaxTokensInput = document.getElementById('profileMaxTokensInput');
  const profileProviderSelect = document.getElementById('profileProviderSelect');
  const profileApiKeyInput = document.getElementById('profileApiKeyInput');
  const profileHint = document.getElementById('profileHint');
  const newProfileBtn = document.getElementById('newProfileBtn');
  const openProfileConfigBtn = document.getElementById('openProfileConfigBtn');
  const reloadProfilesBtn = document.getElementById('reloadProfilesBtn');
  const deleteProfileBtn = document.getElementById('deleteProfileBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const NEW_PROFILE_DRAFT_ID = '__new_profile__';

  const state = {
    profiles: [],
    activeProfileId: '',
    editingProfileId: '',
    profileDirty: false,
    profileSaving: false,
    inlineSettingsDirty: false,
    inlineSettingsSaving: false,
    inlineSaveStatus: '',
    profileStatusOverride: '',
    preferredWorkflowMode: persistedWebviewState.workflowModePreference === 'auto' ? 'auto' : 'continue',
    preferredContextEnabled: persistedWebviewState.workflowContextEnabled === true,
    session: null,
    archivedSessions: [],
    restorableSessionIds: [],
    archiveTransitionPending: false,
    pendingNewRequirement: '',
    passDecisionShownFor: '',
    passDecisionScheduled: false,
    passedTaskConfirmedContinue: '',
    running: false,
    runningLabel: '',
    localLogs: [],
    logEntries: [],
    expandedLogSessions: {},
    resolvedTestsDirty: false,
    lastSessionId: '',
    returnToTaskAfterSave: false,
    workflowMode: 'continue',
    interactiveState: 'idle',
    canResume: false,
    canEditRequirement: false,
    resumeLabel: '',
    interruptRequested: false,
    problemDraftDirty: false,
    additionalInstructionPending: false,
    testDescriptionDirty: false,
    testsDrawerOpen: false,
    workflowProgressExpanded: false,
    testOperation: '',
    testOperationStatus: '',
    testOperationMessage: '',
    operationStatus: '',
    operationMessage: '',
    workflowError: '',
    lastPostedOperation: null,
    operationSequence: 0,
    pendingSelectionTarget: '',
    pendingSelectionMode: '',
    lastProblemSessionId: '',
    lastSyncedProblem: '',
    editablePlanEventId: '',
    editablePlanText: '',
    editingPlanSource: false,
    codeDrafts: {},
    testDrafts: {},
    autoScrollPinned: true,
		lastTimelineSignature: '',
		environmentCheck: { status: 'checking', items: [], checkedAt: '' },
		pythonPath: 'auto',
		inlineCompletion: null,
		settingsTab: 'workflow',
		selectedStudyTaskId: '',
		studyTasks: []
  };

  function reportClientError(reason) {
    try {
      vscode.postMessage({
        type: 'clientError',
        reason: String(reason || 'Unknown webview error.')
      });
    } catch {
      // The extension host may already be unavailable.
    }
  }

  function recordStudyEvent(eventType, metadata) {
    if (!eventType) {
      return;
    }
    vscode.postMessage({
      type: 'recordStudyEvent',
      eventType,
      metadata: metadata || {}
    });
  }

  window.addEventListener('error', function (event) {
    reportClientError(event.message || event.error);
  });

  window.addEventListener('unhandledrejection', function (event) {
    reportClientError(event.reason && event.reason.message ? event.reason.message : event.reason);
  });

  function isNearConversationBottom() {
    if (!conversationScroll) {
      return true;
    }
    return conversationScroll.scrollTop + conversationScroll.clientHeight >= conversationScroll.scrollHeight - 72;
  }

  function scrollConversationToBottom() {
    if (conversationScroll) {
      conversationScroll.scrollTop = conversationScroll.scrollHeight;
    }
    const pageHeight = Math.max(
      document.body ? document.body.scrollHeight : 0,
      document.documentElement ? document.documentElement.scrollHeight : 0
    );
    window.scrollTo(0, pageHeight);
  }

  function requestConversationAutoScroll() {
    scrollConversationToBottom();
    requestAnimationFrame(function () {
      scrollConversationToBottom();
      requestAnimationFrame(scrollConversationToBottom);
    });
    window.setTimeout(scrollConversationToBottom, 80);
  }

  function setTestsDrawerOpen(open, options) {
    state.testsDrawerOpen = Boolean(open);
    if (state.testsDrawerOpen) {
      state.workflowProgressExpanded = false;
    }
    if (taskPage) {
      taskPage.classList.toggle('tests-drawer-open', state.testsDrawerOpen);
    }
    if (testsDrawer) {
      testsDrawer.classList.toggle('open', state.testsDrawerOpen);
      testsDrawer.classList.toggle('hidden', !state.testsDrawerOpen);
      testsDrawer.setAttribute('aria-hidden', state.testsDrawerOpen ? 'false' : 'true');
    }
    [openTestsBtn, testsDrawerToggleBtn].forEach(function (button) {
      if (!button) {
        return;
      }
      button.classList.toggle('is-active', state.testsDrawerOpen);
      button.setAttribute('aria-expanded', state.testsDrawerOpen ? 'true' : 'false');
      button.setAttribute('aria-pressed', state.testsDrawerOpen ? 'true' : 'false');
    });
    if (state.testsDrawerOpen) {
      refreshEditableCodeBlocks();
      if (options && options.focusEditor && testInput) {
        window.setTimeout(function () {
          testInput.focus();
        }, 80);
      }
    }
    renderWorkflowProgress();
  }

  function focusTestSettings() {
    switchPage('task');
    setTestsDrawerOpen(true, { focusEditor: true });
    if (testSettingsDetails) {
      testSettingsDetails.open = true;
      testSettingsDetails.classList.add('jump-target');
    }
    const scrollTarget = testsDrawer || testSettingsDetails;
    if (scrollTarget) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    window.setTimeout(function () {
      if (testSettingsDetails) {
        testSettingsDetails.classList.remove('jump-target');
      }
    }, 1400);
  }

  function switchPage(page) {
    const requestedTests = page === 'tests';
    const normalized = page === 'settings' || page === 'logs' ? page : 'task';
    const isTask = normalized === 'task';
    taskPage.classList.toggle('active', isTask);
    if (testsPage) {
      // Kept for backward compatibility with older extension HTML. Tests now
      // live in the workflow drawer and never require a page transition.
      testsPage.classList.remove('active');
      testsPage.classList.add('legacy-tests-page');
    }
    settingsPage.classList.toggle('active', normalized === 'settings');
    if (logsPage) {
      logsPage.classList.toggle('active', normalized === 'logs');
    }
    if (showOutputBtn) {
      const isLogs = normalized === 'logs';
      showOutputBtn.classList.toggle('is-active', isLogs);
      showOutputBtn.setAttribute('aria-pressed', isLogs ? 'true' : 'false');
    }
    if (openSettingsBtn) {
      const isSettings = normalized === 'settings';
      openSettingsBtn.classList.toggle('is-active', isSettings);
      openSettingsBtn.setAttribute('aria-pressed', isSettings ? 'true' : 'false');
    }
    if (requestedTests) {
      setTestsDrawerOpen(true, { focusEditor: true });
    }
    if (normalized === 'logs') {
      renderLogsPage();
      vscode.postMessage({ type: 'requestLogHistory' });
    }
  }

  function persistSettingsPreferences() {
    vscode.setState(Object.assign({}, vscode.getState() || {}, {
      uiLanguage: uiLanguage,
      workflowModePreference: state.preferredWorkflowMode,
      workflowContextEnabled: state.preferredContextEnabled
    }));
  }

  function switchSettingsTab(tab, focusTab) {
    const requested = tab === 'runtime' ? 'completion' : tab;
    const selected = ['workflow', 'profiles', 'completion', 'environment'].includes(requested)
      ? requested : 'workflow';
    state.settingsTab = selected;
    settingsTabButtons.forEach(function (button) {
      const active = button.dataset.settingsTab === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focusTab) button.focus();
    });
    settingsTabPanels.forEach(function (panel) {
      panel.classList.toggle('hidden', panel.dataset.settingsPanel !== selected);
    });
  }

  function updateTestInputPlaceholder() {
    if (testInput) {
      testInput.dataset.placeholder = t('testInputPlaceholder');
    }
    if (resolvedTestsEditor) {
      resolvedTestsEditor.dataset.placeholder = t('resolvedTestsPlaceholder');
    }
    if (testDescription) {
      testDescription.placeholder = t('testDescriptionPlaceholder');
    }
    if (problemInput) {
      problemInput.placeholder = composerPlaceholder();
    }
  }

  function editableCodeText(element) {
    if (!element) {
      return '';
    }
    // contenteditable paste can create div/br nodes. innerText preserves those
    // visual line boundaries, while textContent would concatenate them.
    return String(element.innerText || element.textContent || '').replace(/\r\n?/g, '\n');
  }

  function insertPlainTextAtSelection(element, text) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
      return false;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(String(text || '').replace(/\r\n?/g, '\n'));
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  }

  function bindPlainTextPaste(element) {
    if (!element) {
      return;
    }
    element.addEventListener('paste', function (event) {
      const text = event.clipboardData && event.clipboardData.getData('text/plain');
      if (typeof text !== 'string') {
        return;
      }
      event.preventDefault();
      if (insertPlainTextAtSelection(element, text)) {
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  function highlightEditableCode(element) {
    if (!element || document.activeElement === element || !window.hljs) {
      return;
    }
    element.removeAttribute('data-highlighted');
    window.hljs.highlightElement(element);
  }

  function setEditableCodeText(element, code) {
    if (!element) {
      return;
    }
    element.textContent = String(code || '');
    highlightEditableCode(element);
  }

  function prepareEditableCodeForInput(element) {
    if (!element) {
      return;
    }
    element.textContent = editableCodeText(element);
  }

  function inferredTestMode() {
    return configuredTestCode().trim() ? 'manual' : 'generate';
  }

  function selectedTestText() {
    const code = configuredTestCode();
    return code.trim() ? code : '';
  }

  function configuredTestCode() {
    const visibleCode = editableCodeText(testInput);
    return visibleCode.trim() ? visibleCode : editableCodeText(resolvedTestsEditor);
  }

  function selectedResolvedTestCode() {
    return undefined;
  }

  function isTestSetupStage() {
    return state.interactiveState === 'await_test_setup';
  }

  function isCodeReviewStage() {
    return state.interactiveState === 'await_code_review';
  }

  function isGenerationTestStage() {
    return state.interactiveState === 'await_generation_tests';
  }

  function isAutoTestEditStage() {
    return state.interactiveState === 'await_auto_test_edit';
  }

  function syncProblemDraft(value) {
    problemInput.value = String(value || '');
    state.problemDraftDirty = true;
    syncActionButtons();
  }

  function syncProblemInputFromSession(force) {
    if (!state.session) {
      state.lastProblemSessionId = '';
      state.lastSyncedProblem = '';
      return;
    }

    const activeSessionId = state.session.session_id || '';
    const sessionChanged = activeSessionId !== state.lastProblemSessionId;
    const incoming = typeof state.session.problem_statement === 'string'
      ? state.session.problem_statement
      : '';
    if (sessionChanged || force) {
      // The text used to create a session must not remain in the follow-up
      // composer. A dirty follow-up draft, however, is never overwritten by
      // polling or a session refresh.
      if (!state.problemDraftDirty || problemInput.value.trim() === incoming.trim()) {
        problemInput.value = '';
        state.problemDraftDirty = false;
      }
    }
    state.lastSyncedProblem = incoming;
    state.lastProblemSessionId = activeSessionId;
  }

  function makeTimestamp() {
    return new Date().toISOString();
  }

  function appendText(current, incoming) {
    const left = String(current || '').replace(/\n+$/, '');
    // Only trim empty boundary lines. Leading spaces may be meaningful Python
    // indentation and must survive selection insertion.
    const right = String(incoming || '').replace(/^\n+/, '');
    if (!left) {
      return right;
    }
    if (!right) {
      return left;
    }
    return left + '\n\n' + right;
  }

  function setInlineStatus(element, message, status) {
    if (!element) {
      return;
    }
    const visible = Boolean(String(message || '').trim());
    element.textContent = visible ? String(message) : '';
    element.className = visible ? 'inline-operation-status visible ' + (status || 'ready') : 'inline-operation-status';
    element.setAttribute('aria-live', status === 'failed' ? 'assertive' : 'polite');
  }

  function renderOperationFeedback() {
    const operationMessage = state.running
      ? (state.runningLabel || t('running'))
      : state.operationMessage;
    const operationStatus = state.running
      ? 'running'
      : state.operationStatus;
    setInlineStatus(operationState, operationMessage, operationStatus);
    setInlineStatus(
      testsSaveResult,
      state.testOperation === 'save' || state.testOperation === 'generate' ? state.testOperationMessage : '',
      state.testOperationStatus
    );
    renderWorkflowProgress();

    if (!workflowError) {
      return;
    }
    workflowError.replaceChildren();
    workflowError.className = state.workflowError ? 'workflow-error visible' : 'workflow-error';
    if (!state.workflowError) {
      return;
    }
    const message = document.createElement('span');
    message.className = 'workflow-error-message';
    message.textContent = state.workflowError;
    workflowError.appendChild(message);
    const actions = document.createElement('span');
    actions.className = 'workflow-error-actions';
    if (state.lastPostedOperation) {
      actions.appendChild(createButton(t('retry'), 'secondary compact-action', function () {
        const pending = state.lastPostedOperation;
        state.workflowError = '';
        state.operationStatus = 'running';
        state.operationMessage = pending.kind === 'requirement'
          ? t('sendingInstructionStatus')
          : pending.kind === 'save'
            ? t('savingTestsStatus')
            : pending.kind === 'generate' ? t('generatingTestsStatus') : t('running');
        state.testOperationStatus = pending.kind === 'save' || pending.kind === 'generate' ? 'running' : '';
        state.testOperationMessage = pending.kind === 'save'
          ? t('savingTestsStatus')
          : pending.kind === 'generate' ? t('generatingTestsStatus') : '';
        renderOperationFeedback();
        vscode.postMessage(pending.message);
      }, state.running));
    }
    actions.appendChild(createButton(t('dismiss'), 'subtle compact-action', function () {
      state.workflowError = '';
      renderOperationFeedback();
    }, false));
    workflowError.appendChild(actions);
  }

  function postTrackedOperation(kind, message) {
    state.operationSequence += 1;
    const trackedMessage = Object.assign({}, message, {
      requestId: message.requestId || ('adaassist-' + Date.now() + '-' + state.operationSequence)
    });
    state.lastPostedOperation = { kind, message: trackedMessage };
    state.workflowError = '';
    state.operationStatus = 'running';
    state.operationMessage = kind === 'requirement'
      ? t('sendingInstructionStatus')
      : kind === 'generate'
        ? t('generatingTestsStatus')
        : kind === 'save' ? t('savingTestsStatus') : t('running');
    if (kind === 'generate') {
      state.testOperation = kind;
      state.testOperationStatus = 'running';
      state.testOperationMessage = t('generatingTestsStatus');
    } else if (kind === 'save') {
      state.testOperation = kind;
      state.testOperationStatus = 'running';
      state.testOperationMessage = t('savingTestsStatus');
    }
    renderOperationFeedback();
    syncActionButtons();
    vscode.postMessage(trackedMessage);
  }

  function completePendingOperations() {
    if (
      state.testOperationStatus === 'running'
      && state.testOperation === 'generate'
      && state.session
      && String(state.session.resolved_test_code || state.session.test_text || '').trim()
    ) {
      state.testOperationStatus = 'passed';
      state.testOperationMessage = t('generatedTestsStatus');
      state.resolvedTestsDirty = true;
      state.operationStatus = 'passed';
      state.operationMessage = t('generatedTestsStatus');
      state.lastPostedOperation = null;
    }
  }

  function addLocalLog(title, message, status) {
    state.localLogs.push({
      id: 'local-' + state.localLogs.length + '-' + Date.now(),
      stage: 'client',
      status: status || 'ready',
      title,
      message,
      created_at: makeTimestamp(),
      data: {}
    });
    renderLogsPage();
  }

  function awaitingTaskConfirmation() {
    return Boolean(state.session && state.session.passed
      && state.passedTaskConfirmedContinue !== state.session.session_id);
  }

  function renderPassedTaskDecision() {
    if (!awaitingTaskConfirmation()) return;
    const card = document.createElement('section');
    card.className = 'ada-task-confirmation';
    card.style.cssText = 'margin:12px 0;padding:14px;border:1px solid var(--vscode-focusBorder);border-radius:10px;';
    const title = document.createElement('strong');
    title.textContent = uiLanguage === 'zh-CN' ? '公开测试全部通过，是否结束当前任务？' : 'Public tests passed. Finish this task?';
    const description = document.createElement('p');
    description.textContent = uiLanguage === 'zh-CN'
      ? '确认结束将归档当前 Session，保留上方历史。下一条输入是全新任务，不会作为 Guidance。'
      : 'Finishing archives this session without deleting its history; your next input starts a new task.';
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    const finish = document.createElement('button');
    finish.type = 'button';
    finish.className = 'btn primary';
    finish.textContent = uiLanguage === 'zh-CN' ? '确认结束 · 新任务' : 'Finish · New task';
    finish.disabled = state.running;
    finish.addEventListener('click', function () {
      finish.disabled = true;
      vscode.postMessage({ type: 'clearWorkflowSession', reason: 'user_confirmed' });
    });
    const continueButton = document.createElement('button');
    continueButton.type = 'button';
    continueButton.className = 'btn';
    continueButton.textContent = uiLanguage === 'zh-CN' ? '继续完善当前任务' : 'Continue refining';
    continueButton.disabled = state.running;
    continueButton.addEventListener('click', function () {
      state.passedTaskConfirmedContinue = state.session.session_id;
      renderAll();
      problemInput.focus();
    });
    actions.append(finish, continueButton);
    card.append(title, description, actions);
    timeline.appendChild(card);
  }

  function applyWorkflowSessionData(data) {
    if (Array.isArray(data.logEntries)) {
      state.logEntries = data.logEntries;
    }
    state.session = data.session && typeof data.session === 'object' ? data.session : null;
    if (Array.isArray(data.restorableSessionIds)) state.restorableSessionIds = data.restorableSessionIds;
    if (state.session && state.session.session_id === data.restoredSessionId) {
      state.passedTaskConfirmedContinue = state.session.session_id;
    }
    if (Array.isArray(data.archivedSessions)) {
      const previousCount = state.archivedSessions.length;
      state.archivedSessions = data.archivedSessions;
      if (state.archivedSessions.length > previousCount) {
        state.archiveTransitionPending = true;
        state.autoScrollPinned = true;
      }
    }
    state.workflowMode = state.session
      ? (data.workflowMode === 'auto' ? 'auto' : 'continue')
      : state.preferredWorkflowMode;
    state.interactiveState = typeof data.interactiveState === 'string' ? data.interactiveState : 'idle';
    state.canResume = Boolean(data.canResume);
    state.canEditRequirement = Boolean(data.canEditRequirement);
    state.resumeLabel = typeof data.resumeLabel === 'string' ? data.resumeLabel : '';
    state.interruptRequested = Boolean(data.interruptRequested);
    executionModeSelect.value = state.workflowMode;
    if (!state.session) contextEnabledInput.checked = state.preferredContextEnabled;

    if (state.session) {
      syncProblemInputFromSession(false);
      if (!state.resolvedTestsDirty) {
        setEditableCodeText(testInput, state.session.test_text || state.session.resolved_test_code || editableCodeText(testInput));
        setEditableCodeText(resolvedTestsEditor, state.session.test_text || state.session.resolved_test_code || editableCodeText(resolvedTestsEditor));
      }
      if (testDescription && !state.testDescriptionDirty && typeof state.session.test_description === 'string') {
        testDescription.value = state.session.test_description;
      }
      testModeSelect.value = state.session.test_mode === 'generate' ? 'generate' : 'manual';
      contextEnabledInput.checked = Boolean(state.session.context_enabled);
      completePendingOperations();
      return;
    }

    state.lastSessionId = '';
    state.lastTimelineSignature = '';
    state.lastProblemSessionId = '';
    state.lastSyncedProblem = '';
    if (state.pendingNewRequirement) {
      const newRequirement = state.pendingNewRequirement;
      state.pendingNewRequirement = '';
      resetTaskDraft();
      problemInput.value = newRequirement;
      state.problemDraftDirty = true;
      postTrackedOperation('workflow', Object.assign({ type: 'runWorkflow' }, currentRequestPayload()));
    }
  }

  function findProfile(id) {
    return state.profiles.find((profile) => profile.id === id);
  }

  function selectedProfile() {
    return findProfile(taskProfileSelect.value || state.activeProfileId);
  }

  function profileConfigIssue() {
    const profile = selectedProfile();
    if (!profile) {
      return uiLanguage === 'zh-CN'
        ? '尚未选择 LLM 配置。请打开“配置”并新建配置后再启动工作流。'
        : 'No LLM profile is selected. Open Profiles and create one before starting the workflow.';
    }

    const provider = profile.provider || 'other';
    const model = String(profile.model || '').trim();
    const baseUrl = String(profile.baseUrl || '').trim();
    if (!model) {
      return uiLanguage === 'zh-CN' ? '当前 LLM 配置缺少模型名称。' : 'The active LLM profile is missing a model name.';
    }
    if ((provider === 'other' || provider === 'ollama' || provider === 'vllm') && !baseUrl) {
      return uiLanguage === 'zh-CN' ? '当前配置需要 OpenAI 兼容的基础 URL。' : 'The active profile needs an OpenAI-compatible Base URL.';
    }
    if (!profile.apiKeyConfigured && provider !== 'ollama' && provider !== 'vllm') {
      return uiLanguage === 'zh-CN' ? '当前配置需要 API 密钥或 apiKeyEnv。' : 'The active profile needs an API key or apiKeyEnv.';
    }
    return '';
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function normalizeLanguage(language) {
    const normalized = String(language || '').trim().toLowerCase();
    if (!normalized) {
      return 'text';
    }
    if (normalized === 'py') {
      return 'python';
    }
    if (normalized === 'plaintext' || normalized === 'txt') {
      return 'text';
    }
    return normalized;
  }

  function highlightWithLibrary(code, language) {
    const normalizedLanguage = normalizeLanguage(language);
    if (window.hljs && normalizedLanguage !== 'text') {
      try {
        if (window.hljs.getLanguage(normalizedLanguage)) {
          return window.hljs.highlight(String(code || ''), { language: normalizedLanguage }).value;
        }
        return window.hljs.highlightAuto(String(code || '')).value;
      } catch (_error) {
        return escapeHtml(code);
      }
    }
    return escapeHtml(code);
  }

  function markdownRenderer() {
    if (!window.markdownit) {
      return null;
    }
    const md = window.markdownit({
      breaks: false,
      html: false,
      linkify: true
    });
    md.renderer.rules.fence = function (tokens, index) {
      const token = tokens[index];
      const language = normalizeLanguage(token.info || 'text');
      const highlighted = highlightWithLibrary(token.content, language);
      return [
        '<div class="code-shell">',
        '<div class="code-toolbar"><div class="code-language">',
        escapeHtml(language),
        '</div></div>',
        '<pre class="code-block hljs"><code class="language-',
        escapeHtml(language),
        '">',
        highlighted,
        '</code></pre>',
        '</div>'
      ].join('');
    };
    return md;
  }

  const md = markdownRenderer();

  function renderMarkdown(text) {
    const root = document.createElement('div');
    root.className = 'markdown';
    if (!md) {
      root.textContent = String(text || '');
      return root;
    }
    root.innerHTML = md.render(String(text || ''));
    root.querySelectorAll('a[href]').forEach(function (link) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noreferrer noopener');
    });
    root.querySelectorAll('.code-shell').forEach(function (shell) {
      const code = shell.querySelector('pre.code-block > code');
      if (code) {
        installCopyButton(shell, function () { return code.textContent || ''; });
      }
    });
    return root;
  }

  function renderEditableCodeBlock(text, language, placeholder, onInput, options) {
    const shell = document.createElement('div');
    shell.className = 'editable-code-shell';
    if (normalizeLanguage(language) === 'markdown') {
      shell.classList.add('markdown-source-shell');
    }
    const editable = !options || options.editable !== false;

    const toolbar = document.createElement('div');
    toolbar.className = 'code-toolbar';
    const languageLabel = document.createElement('div');
    languageLabel.className = 'code-language';
    languageLabel.textContent = normalizeLanguage(language);
    toolbar.appendChild(languageLabel);

    const actions = options && Array.isArray(options.actions) ? options.actions : [];
    if (actions.length > 0) {
      const actionsWrap = document.createElement('div');
      actionsWrap.className = 'code-toolbar-actions';
      actions.forEach(function (action) {
        actionsWrap.appendChild(createCodeActionButton(action));
      });
      toolbar.appendChild(actionsWrap);
    }

    const pre = document.createElement('pre');
    pre.className = 'code-block hljs editable-code-block';
    const code = document.createElement('code');
    code.className = 'language-' + normalizeLanguage(language) + ' editable-code';
    code.contentEditable = editable && !state.running ? 'true' : 'false';
    code.spellcheck = false;
    code.dataset.placeholder = placeholder || 'Edit code here.';
    setEditableCodeText(code, text);
    code.addEventListener('focus', function () {
      prepareEditableCodeForInput(code);
    });
    code.addEventListener('blur', function () {
      highlightEditableCode(code);
    });
    code.addEventListener('input', function () {
      onInput(editableCodeText(code));
    });
    bindPlainTextPaste(code);

    pre.appendChild(code);
    shell.appendChild(toolbar);
    shell.appendChild(pre);
    installCopyButton(shell, function () { return editableCodeText(code); });
    return shell;
  }

  function renderEditableMarkdown(text, onInput, placeholder) {
    return renderEditableCodeBlock(text, 'markdown', placeholder || 'Edit markdown here.', function (value) {
      onInput(value.trim());
    });
  }

  function renderPlanPreview(planText) {
    const preview = document.createElement('div');
    preview.className = 'plan-preview';
    const cleaned = String(planText || '').trim();
    if (!cleaned) {
      preview.classList.add('empty-plan-preview');
      const empty = document.createElement('div');
      empty.className = 'hint';
      empty.textContent = t('noPlan');
      preview.appendChild(empty);
      return preview;
    }
    preview.appendChild(renderMarkdown(cleaned));
    return preview;
  }

  function cardKindLabel(kind) {
    switch (kind) {
      case 'prompt':
        return t('requirement');
      case 'code':
        return t('code');
      case 'result':
        return t('runResult');
      case 'plan':
        return t('plan');
      case 'tests':
        return t('tests');
      case 'session':
        return t('session');
      default:
        return t('note');
    }
  }

  function createButton(label, className, onClick, disabled) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ' + (className || '');
    button.textContent = label;
    button.disabled = Boolean(disabled);
    button.addEventListener('click', onClick);
    return button;
  }

  function createCodeActionIcon(name) {
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('code-action-icon');
    const paths = {
      open: ['M14 4h6v6', 'M20 4 11 13', 'M18 13v6H5V6h6'],
      tests: ['M9 3h6', 'M10 3v5l-5 9a2.5 2.5 0 0 0 2.2 4h9.6a2.5 2.5 0 0 0 2.2-4l-5-9V3', 'M8 16h8'],
      insert: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 18v3h14v-3'],
      retest: ['M20 8V4h-4', 'M20 4a9 9 0 1 0 1 11'],
      copy: ['M9 9h11v11H9z', 'M4 15V4h11'],
      check: ['m5 12 4 4L19 6']
    }[name] || [];
    paths.forEach(function (data) {
      const path = document.createElementNS(namespace, 'path');
      path.setAttribute('d', data);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.7');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
    });
    return svg;
  }

  function createCodeActionButton(action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-icon-button' + (action.primary ? ' primary' : '');
    button.title = action.label;
    button.setAttribute('aria-label', action.label);
    button.disabled = Boolean(action.disabled);
    button.appendChild(createCodeActionIcon(action.icon));
    button.addEventListener('click', action.onClick);
    return button;
  }

  async function copyText(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(String(text || ''));
        return;
      } catch (_error) {
        // Fall back to the webview document command below.
      }
    }
    const fallback = document.createElement('textarea');
    fallback.value = String(text || '');
    fallback.setAttribute('readonly', '');
    fallback.className = 'copy-fallback';
    document.body.appendChild(fallback);
    fallback.select();
    const copied = document.execCommand('copy');
    fallback.remove();
    if (!copied) {
      throw new Error('Clipboard is unavailable.');
    }
  }

  function announceCopy(message) {
    let status = document.getElementById('copyStatus');
    if (!status) {
      status = document.createElement('div');
      status.id = 'copyStatus';
      status.className = 'visually-hidden';
      status.setAttribute('aria-live', 'polite');
      document.body.appendChild(status);
    }
    status.textContent = '';
    window.setTimeout(function () { status.textContent = message; }, 0);
  }

  function installCopyButton(shell, getText) {
    if (!shell || shell.querySelector('.copy-code-button')) {
      return;
    }
    const toolbar = shell.querySelector('.code-toolbar');
    if (!toolbar) {
      return;
    }
    let actions = toolbar.querySelector('.code-toolbar-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'code-toolbar-actions';
      toolbar.appendChild(actions);
    }
    const button = createCodeActionButton({
      icon: 'copy',
      label: t('copyCode'),
      onClick: async function () {
        try {
          await copyText(getText());
          button.replaceChildren(createCodeActionIcon('check'));
          button.title = t('copied');
          button.setAttribute('aria-label', t('copied'));
          announceCopy(t('copied'));
          window.setTimeout(function () {
            if (!button.isConnected) {
              return;
            }
            button.replaceChildren(createCodeActionIcon('copy'));
            button.title = t('copyCode');
            button.setAttribute('aria-label', t('copyCode'));
          }, 1500);
        } catch (_error) {
          button.title = t('copyFailed');
          button.setAttribute('aria-label', t('copyFailed'));
          announceCopy(t('copyFailed'));
        }
      }
    });
    button.classList.add('copy-code-button');
    actions.appendChild(button);
  }

  function createCardFrame(kind, event) {
    const card = document.createElement('article');
    card.className = 'timeline-card conversation-card chat-turn ' + kind + ' ' + ((event && event.status) || 'ready');
    card.dataset.kind = kind;

    const top = document.createElement('div');
    top.className = 'timeline-top';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'chat-turn-heading';

    const author = document.createElement('div');
    author.className = 'chat-author';
    author.textContent = kind === 'session' ? (uiLanguage === 'zh-CN' ? '你' : 'You') : 'AdaAssist';

    const title = document.createElement('div');
    title.className = 'timeline-title';
    title.textContent = kind === 'session' ? '' : ((event && event.title) || cardKindLabel(kind));

    titleWrap.appendChild(author);
    if (title.textContent) {
      titleWrap.appendChild(title);
    }

    top.appendChild(titleWrap);
    card.appendChild(top);

    return card;
  }

  function createActionRow(className) {
    const row = document.createElement('div');
    row.className = 'action-row card-actions' + (className ? ' ' + className : '');
    return row;
  }

  function renderFencedCodeMarkdown(code, language, options) {
    const fenced = ['```' + normalizeLanguage(language), String(code || ''), '```'].join('\n');
    const root = renderMarkdown(fenced);
    const actions = options && Array.isArray(options.actions) ? options.actions : [];
    if (actions.length > 0) {
      const shell = root.querySelector('.code-shell');
      const toolbar = shell ? shell.querySelector('.code-toolbar') : null;
      if (toolbar) {
        const actionsWrap = document.createElement('div');
        actionsWrap.className = 'code-toolbar-actions';
        actions.forEach(function (action) {
          actionsWrap.appendChild(createCodeActionButton(action));
        });
        toolbar.appendChild(actionsWrap);
      }
    }
    return root;
  }

  function refreshEditableCodeBlocks() {
    highlightEditableCode(testInput);
    highlightEditableCode(resolvedTestsEditor);
  }

  function currentActionPayload() {
    const testMode = inferredTestMode();
    const additionalInstruction = state.session ? problemInput.value.trim() : '';
    const payload = {
      problem: state.session ? state.session.problem_statement : problemInput.value,
      additionalInstruction,
      testText: selectedTestText(),
      testMode,
      testDescription: testDescription ? testDescription.value.trim() : '',
      resolvedTestCode: testMode === 'generate' ? selectedResolvedTestCode() : undefined,
      contextEnabled: Boolean(contextEnabledInput.checked),
      maxRounds: 10,
      executionMode: executionModeSelect.value === 'continue' ? 'continue' : 'auto'
    };
    const codeReview = currentCodeReviewPayload();
    if (codeReview) {
      payload.codeOverride = codeReview.codeOverride;
      payload.codeEventId = codeReview.codeEventId;
    }
    return payload;
  }

  function isInteractiveSelected() {
    return executionModeSelect.value === 'continue';
  }

  function currentCodeReviewPayload() {
    if (!isCodeReviewStage()) {
      return null;
    }
    const events = sortedSessionEvents();
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      const data = event.data || {};
      const code = typeof data.code === 'string' ? data.code : '';
      const isCodeEvent = (event.stage === 'generate' || event.stage === 'regenerate' || event.stage === 'debug_fix')
        && event.status === 'completed'
        && Boolean(code.trim());
      if (isCodeEvent) {
        return {
          codeOverride: codeDraftFor(event, code),
          codeEventId: event.id
        };
      }
    }
    return null;
  }

  function sortedSessionEvents() {
    const sessionEvents = state.session && Array.isArray(state.session.events) ? state.session.events.slice() : [];
    return sessionEvents.sort((left, right) => String(left.created_at || '').localeCompare(String(right.created_at || '')));
  }

  function logTimestamp(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return date.toLocaleString(uiLanguage === 'zh-CN' ? 'zh-CN' : 'en-US', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function localizedLogStatus(status) {
    const normalized = String(status || 'ready').toLowerCase();
    const labels = uiLanguage === 'zh-CN'
      ? { ready: '就绪', running: '运行中', completed: '已完成', passed: '已通过', failed: '失败', error: '错误', warning: '警告', waiting: '等待中' }
      : { ready: 'Ready', running: 'Running', completed: 'Completed', passed: 'Passed', failed: 'Failed', error: 'Error', warning: 'Warning', waiting: 'Waiting' };
    return labels[normalized] || normalized;
  }

  function localizedLogCategory(category) {
    return {
      workflow: t('workflowLog'),
      model: t('logModel'),
      evaluation: t('logEvaluation'),
      interaction: t('logInteraction'),
      extension: t('localLog')
    }[category] || String(category || t('workflowLog'));
  }

  function localizedLogEvent(value) {
    const event = String(value || 'workflow_ready');
    if (event === 'extension_message') {
      return uiLanguage === 'zh-CN' ? '扩展消息' : 'Extension message';
    }
    const interactionLabels = uiLanguage === 'zh-CN'
      ? { task_start: '任务开始', task_end: '任务结束', test_edit: '测试已编辑', plan_edit: '计划已编辑', code_edit: '代码已编辑', requirement_edit: '补充指导', test_view: '查看测试' }
      : { task_start: 'Task started', task_end: 'Task ended', test_edit: 'Tests edited', plan_edit: 'Plan edited', code_edit: 'Code edited', requirement_edit: 'Guidance added', test_view: 'Tests viewed' };
    if (interactionLabels[event]) {
      return interactionLabels[event];
    }
    const statuses = ['completed', 'running', 'waiting', 'failed', 'passed', 'ready'];
    const status = statuses.find(function (candidate) { return event.endsWith('_' + candidate); });
    if (status) {
      const stage = event.slice(0, -(status.length + 1));
      return workflowStageLabel(stage) + ' · ' + localizedLogStatus(status);
    }
    return event.replaceAll('_', ' ');
  }

  function renderLogsPage() {
    if (!visualLogList) {
      return;
    }
    const previousScrollTop = visualLogList.scrollTop;
    visualLogList.innerHTML = '';
    const entries = Array.isArray(state.logEntries) ? state.logEntries : [];
    const snapshotIds = new Set([
      ...(state.restorableSessionIds || []),
      ...(state.archivedSessions || []).map(session => session.session_id)
    ]);
    if (entries.length === 0 && snapshotIds.size === 0) {
      const empty = document.createElement('div');
      empty.className = 'visual-log-empty';
      empty.textContent = t('noLogs');
      visualLogList.appendChild(empty);
      return;
    }
    const groups = new Map();
    entries.forEach(function (entry) {
      const key = String(entry.sessionId || '__extension__');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(entry);
    });
    // Full checkpoints outlive the small 30-day diagnostic history.
    // Keep those sessions visible in Logs even if their event summaries expired.
    snapshotIds.forEach(function (id) {
      if (id && !groups.has(id)) groups.set(id, []);
    });

    groups.forEach(function (groupEntries, sessionKey) {
      const sessionId = sessionKey === '__extension__' ? '' : sessionKey;
      const currentSessionId = state.session && state.session.session_id ? String(state.session.session_id) : '';
      const isCurrent = Boolean(sessionId && sessionId === currentSessionId);
      const group = document.createElement('details');
      group.className = 'visual-log-session';
      group.dataset.sessionId = sessionKey;
      group.open = Object.prototype.hasOwnProperty.call(state.expandedLogSessions, sessionKey)
        ? Boolean(state.expandedLogSessions[sessionKey])
        : isCurrent;
      group.addEventListener('toggle', function () {
        state.expandedLogSessions[sessionKey] = group.open;
      });

      const groupSummary = document.createElement('summary');
      groupSummary.className = 'visual-log-session-summary';
      const identity = document.createElement('span');
      identity.className = 'visual-log-session-title';
      identity.textContent = sessionId
        ? t('logSession') + ' ' + sessionId.slice(0, 8)
        : t('unscopedLogs');
      identity.title = sessionId;
      const summaryMeta = document.createElement('span');
      summaryMeta.className = 'visual-log-session-meta';
      const latestTimestamp = groupEntries[0] && groupEntries[0].timestamp;
      summaryMeta.textContent = [
        isCurrent ? t('currentLogSession') : '',
        groupEntries.length ? groupEntries.length + ' ' + t('logEvents') : (snapshotIds.has(sessionId)
          ? (uiLanguage === 'zh-CN' ? '已保存完整快照' : 'Saved full snapshot')
          : '0 ' + t('logEvents')),
        logTimestamp(latestTimestamp)
      ].filter(Boolean).join(' · ');
      const summaryContent = document.createElement('span');
      summaryContent.className = 'visual-log-session-identity';
      summaryContent.append(identity, summaryMeta);
      groupSummary.appendChild(summaryContent);
      const hasSnapshot = Boolean((state.archivedSessions || []).some(item => item.session_id === sessionId))
        || (state.restorableSessionIds || []).includes(sessionId);
      if (sessionId && !isCurrent) {
        const restore = document.createElement('button');
        restore.type = 'button';
        restore.className = 'ada-restore-session visual-log-restore';
        restore.textContent = '↩';
        restore.title = hasSnapshot
          ? (uiLanguage === 'zh-CN' ? '恢复此会话' : 'Restore session')
          : (uiLanguage === 'zh-CN'
            ? '尝试从后端恢复（仅有诊断日志的会话可能无法恢复）'
            : 'Try restoring from backend (diagnostic-only logs may not be recoverable)');
        restore.setAttribute('aria-label', restore.title);
        restore.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          vscode.postMessage({ type: 'restoreArchivedSession', sessionId });
        });
        groupSummary.appendChild(restore);
      }
      group.appendChild(groupSummary);

      const groupBody = document.createElement('div');
      groupBody.className = 'visual-log-session-body';
      groupEntries.forEach(function (entry) {
      const item = document.createElement('article');
      item.className = 'visual-log-entry ' + String(entry.level || 'info').toLowerCase();

      const head = document.createElement('div');
      head.className = 'visual-log-head';
      const title = document.createElement('div');
      title.className = 'visual-log-title';
      title.textContent = localizedLogEvent(entry.event);
      const time = document.createElement('time');
      time.className = 'visual-log-time';
      time.textContent = logTimestamp(entry.timestamp);
      head.appendChild(title);
      head.appendChild(time);
      item.appendChild(head);

      const meta = document.createElement('div');
      meta.className = 'visual-log-meta';
      const source = document.createElement('span');
      source.className = 'visual-log-source';
      source.textContent = localizedLogCategory(entry.category);
      const status = document.createElement('span');
      status.className = 'visual-log-status';
      meta.appendChild(source);
      if (entry.level && entry.level !== 'info') {
        status.textContent = localizedLogStatus(entry.level);
        meta.appendChild(status);
      }
      item.appendChild(meta);

      if (entry.message) {
        const message = document.createElement('div');
        message.className = 'visual-log-message';
        message.textContent = String(entry.message);
        item.appendChild(message);
      }
        groupBody.appendChild(item);
      });
      group.appendChild(groupBody);
      visualLogList.appendChild(group);
    });
    visualLogList.scrollTop = previousScrollTop;
  }

  function getPlanText(event, fallback) {
    const plan = event && event.data && typeof event.data.plan === 'string' ? event.data.plan.trim() : '';
    if (plan) {
      return plan;
    }
    return fallback || '';
  }

  function latestPlanEvent(events) {
    const planEvents = events.filter((event) => {
      const plan = getPlanText(event, '');
      return event.stage === 'plan' && (event.status === 'completed' || event.status === 'ready') && Boolean(plan);
    });
    return planEvents.length > 0 ? planEvents[planEvents.length - 1] : null;
  }

  function latestFailedEvaluateEvent(events) {
    const failed = events.filter((event) => event.stage === 'evaluate' && event.status === 'failed');
    return failed.length > 0 ? failed[failed.length - 1] : null;
  }

  function latestEvaluateEvent(events) {
    const evaluateEvents = events.filter((event) => event.stage === 'evaluate' && (event.status === 'completed' || event.status === 'failed'));
    return evaluateEvents.length > 0 ? evaluateEvents[evaluateEvents.length - 1] : null;
  }

  function syncEditablePlanDraft() {
    const events = sortedSessionEvents();
    const latestPlan = latestPlanEvent(events);
    const latestPlanId = latestPlan ? latestPlan.id : '';
    const latestPlanText = latestPlan ? getPlanText(latestPlan, state.session ? state.session.current_plan || '' : '') : '';

    if (state.interactiveState !== 'await_plan') {
      state.editablePlanEventId = '';
      state.editablePlanText = '';
      state.editingPlanSource = false;
      return;
    }

    if (latestPlanId !== state.editablePlanEventId) {
      state.editablePlanEventId = latestPlanId;
      state.editablePlanText = latestPlanText;
      state.editingPlanSource = false;
    }
  }

  function renderSessionCard() {
    if (!state.session || !state.session.problem_statement) {
      return null;
    }

    const card = createCardFrame('session', {
      stage: 'session',
      status: 'ready',
      created_at: state.session.created_at
    });
    card.classList.add('user-card');
    const initial = sortedSessionEvents().find(event => event.data && typeof event.data.initial_problem === 'string');
    card.appendChild(renderMarkdown(initial ? initial.data.initial_problem : state.session.problem_statement));

    return card;
  }

  function codeDraftFor(event, code) {
    if (!event || !event.id) {
      return String(code || '');
    }
    if (typeof state.codeDrafts[event.id] !== 'string') {
      state.codeDrafts[event.id] = String(code || '');
    }
    return state.codeDrafts[event.id];
  }

  function appendResultContent(card, event, isLatestEvaluate, isLatestFailed, codeForInsert, originalCode) {
    const evaluation = event.data && typeof event.data.evaluation === 'object' ? event.data.evaluation : {};
    const summary = document.createElement('div');
    summary.className = 'result-summary';
    let testCasesDetails = null;
    let hasRenderedStructuredFailures = false;

    function appendResultLine(markdown, className) {
      const line = renderMarkdown(markdown);
      line.classList.add('result-line');
      if (className) {
        line.classList.add(className);
      }
      summary.appendChild(line);
    }

    const passed = evaluation && evaluation.passed === true;
    const failed = event.status === 'failed' || (evaluation && evaluation.passed === false);

    if (event.message) {
      appendResultLine(event.message, passed ? 'passed' : failed ? 'failed' : '');
    }
    const testSummary = evaluation && typeof evaluation.test_summary === 'object' ? evaluation.test_summary : null;
    const testResults = evaluation && Array.isArray(evaluation.test_results) ? evaluation.test_results : [];
    if (testSummary && Number(testSummary.total) > 0 && testResults.length > 0) {
      const total = Number(testSummary.total);
      const passedCount = Number(testSummary.passed) || 0;
      const failedCount = Number(testSummary.failed) || 0;
      const rate = Math.max(0, Math.min(1, Number(testSummary.pass_rate) || 0));
      const percentage = Math.round(rate * 100);

      const score = document.createElement('div');
      score.className = 'test-score' + (failedCount > 0 ? ' has-failures' : ' all-passed');
      score.setAttribute('role', 'status');
      score.setAttribute('aria-label', uiLanguage === 'zh-CN'
        ? passedCount + ' / ' + total + ' 个测试通过，通过率 ' + percentage + '%'
        : passedCount + ' of ' + total + ' tests passed, ' + percentage + '% pass rate');
      const scoreText = document.createElement('span');
      scoreText.className = 'test-score-text';
      scoreText.textContent = uiLanguage === 'zh-CN'
        ? '测试通过 ' + passedCount + '/' + total + ' · ' + percentage + '%'
        : 'Tests passed ' + passedCount + '/' + total + ' · ' + percentage + '%';
      const track = document.createElement('span');
      track.className = 'test-score-track';
      track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('span');
      fill.className = 'test-score-fill';
      fill.style.width = percentage + '%';
      track.appendChild(fill);
      score.appendChild(scoreText);
      score.appendChild(track);
      summary.appendChild(score);

      testCasesDetails = document.createElement('details');
      testCasesDetails.className = 'message-details test-cases-details';
      const casesSummary = document.createElement('summary');
      casesSummary.textContent = uiLanguage === 'zh-CN'
        ? '逐项结果 · ' + passedCount + ' 通过，' + failedCount + ' 失败'
        : 'Test cases · ' + passedCount + ' passed, ' + failedCount + ' failed';
      testCasesDetails.appendChild(casesSummary);
      const cases = document.createElement('div');
      cases.className = 'test-case-list';
      testResults.forEach(function (item, index) {
        const itemPassed = item && item.passed === true;
        const row = document.createElement('div');
        row.className = 'test-case-row ' + (itemPassed ? 'passed' : 'failed');
        const heading = document.createElement('div');
        heading.className = 'test-case-heading';
        const status = document.createElement('span');
        status.className = 'test-case-status';
        status.textContent = itemPassed
          ? (uiLanguage === 'zh-CN' ? '通过' : 'Passed')
          : (uiLanguage === 'zh-CN' ? '失败' : 'Failed');
        const position = document.createElement('span');
        position.className = 'test-case-position';
        const line = Number(item && item.line);
        position.textContent = '#' + (Number(item && item.index) || index + 1)
          + (line > 0 ? (uiLanguage === 'zh-CN' ? ' · 第 ' + line + ' 行' : ' · line ' + line) : '');
        heading.appendChild(status);
        heading.appendChild(position);
        row.appendChild(heading);
        const source = document.createElement('code');
        source.className = 'test-case-source';
        source.textContent = String((item && item.source) || 'assert');
        row.appendChild(source);
        if (!itemPassed && item && item.message) {
          const message = document.createElement('div');
          message.className = 'test-case-message';
          const errorType = String(item.error_type || '').trim();
          message.textContent = (errorType ? errorType + ': ' : '') + String(item.message);
          row.appendChild(message);
        }
        cases.appendChild(row);
      });
      testCasesDetails.appendChild(cases);
      hasRenderedStructuredFailures = testResults.some(function (item) {
        return item && typeof item === 'object' && item.passed !== true;
      });
    }
    if (evaluation && typeof evaluation.error === 'string' && evaluation.error && !hasRenderedStructuredFailures) {
      appendResultLine('**Error:** ' + evaluation.error, 'failed');
    }

    if (summary.childNodes.length > 0) {
      card.appendChild(summary);
    }
    if (testCasesDetails) {
      card.appendChild(testCasesDetails);
    }

    const technicalFields = [];
    if (evaluation && typeof evaluation.stage === 'string' && evaluation.stage) {
      technicalFields.push('**Stage:** `' + evaluation.stage + '`');
    }
    if (evaluation && typeof evaluation.error_type === 'string' && evaluation.error_type) {
      technicalFields.push('**Error Type:** `' + evaluation.error_type + '`');
    }
    if (evaluation && typeof evaluation.passed === 'boolean') {
      technicalFields.push('**Passed:** ' + (evaluation.passed ? 'yes' : 'no'));
    }
    if (technicalFields.length > 0) {
      const technical = document.createElement('details');
      technical.className = 'message-details';
      const technicalSummary = document.createElement('summary');
      technicalSummary.textContent = uiLanguage === 'zh-CN' ? '运行详情' : 'Run details';
      technical.appendChild(technicalSummary);
      technical.appendChild(renderMarkdown(technicalFields.join('\n')));
      card.appendChild(technical);
    }

    if (evaluation && typeof evaluation.traceback === 'string' && evaluation.traceback.trim()) {
      const trace = document.createElement('details');
      trace.className = 'message-details';
      const label = document.createElement('summary');
      label.textContent = 'Traceback';
      trace.appendChild(label);
      trace.appendChild(renderFencedCodeMarkdown(evaluation.traceback.trim(), 'text'));
      card.appendChild(trace);
    }

    if (isLatestFailed && state.workflowMode === 'continue' && isInteractiveSelected()) {
      const row = createActionRow('compact-card-actions');
      row.appendChild(createButton(t('nextStep'), '', function () {
        vscode.postMessage(Object.assign({ type: 'continueWithFeedback' }, currentActionPayload()));
      }, state.running));
      row.appendChild(createButton(t('restartAction'), 'secondary', function () {
        vscode.postMessage(Object.assign({ type: 'restartInteractiveWorkflow' }, currentActionPayload()));
      }, state.running));
      row.appendChild(createButton(t('doneAction'), 'subtle', function () {
        vscode.postMessage({ type: 'stopInteractiveWorkflow' });
      }, state.running));
      card.appendChild(row);
    }

    if (!isLatestFailed && isLatestEvaluate && evaluation && evaluation.passed === true && state.session && state.session.passed) {
      const row = createActionRow('compact-card-actions');
      row.appendChild(createButton(t('insertCode'), '', function () {
        const code = codeForInsert || (state.session && state.session.current_code) || '';
        if (!code) {
          return;
        }
        if (typeof originalCode === 'string' && code !== originalCode) {
          recordStudyEvent('code_edit', { action: 'insert_edited_code', code });
        }
        recordStudyEvent('accept_result', { action: 'insert_generated_code', code });
        vscode.postMessage({
          type: 'insertGeneratedCode',
          code
        });
      }, state.running || !(codeForInsert || (state.session && state.session.current_code))));
      row.appendChild(createButton(t('restartAction'), 'secondary', function () {
        vscode.postMessage(Object.assign({ type: 'restartInteractiveWorkflow' }, currentActionPayload()));
      }, state.running));
      card.appendChild(row);
    }
  }

  function renderResultCard(event, isLatestEvaluate, isLatestFailed) {
    const card = createCardFrame('result', event);
    const data = event.data || {};
    const testCode = typeof data.test_code === 'string' ? data.test_code : '';
    if (testCode.trim()) {
      const tests = document.createElement('details');
      tests.className = 'message-details';
      const label = document.createElement('summary');
      label.textContent = uiLanguage === 'zh-CN' ? '查看测试' : 'Tests used';
      tests.appendChild(label);
      tests.appendChild(renderFencedCodeMarkdown(testCode, 'python'));
      card.appendChild(tests);
    }
    appendResultContent(card, event, isLatestEvaluate, isLatestFailed);
    return card;
  }

  function renderAttemptCard(entry) {
    const displayEvent = Object.assign({}, entry.event);
    if (entry.resultEvent) {
      displayEvent.status = entry.resultEvent.status;
      displayEvent.message = entry.resultEvent.message;
    }
    const card = createCardFrame('code', displayEvent);
    const draft = codeDraftFor(entry.event, entry.code);
    const codeEditable = Boolean(entry.resultEvent) && !state.running;

    const codeActions = [
      {
        label: t('openCode'),
        icon: 'open',
        onClick: function () {
          vscode.postMessage({
            type: 'openGeneratedCode',
            code: codeDraftFor(entry.event, entry.code)
          });
        },
        disabled: state.running
      }
    ];
    if (state.workflowMode === 'continue') {
      codeActions.push({
        label: t('editTests'),
        icon: 'tests',
        onClick: function () {
          recordStudyEvent('test_view', { action: 'open_tests_editor' });
          focusTestSettings();
        },
        disabled: state.running || !codeEditable
      });
    }
    codeActions.push(
      {
        label: t('insertCode'),
        icon: 'insert',
        onClick: function () {
          const code = codeDraftFor(entry.event, entry.code);
          if (code !== entry.code) {
            recordStudyEvent('code_edit', { action: 'insert_edited_code', code, code_event_id: entry.event.id });
          }
          recordStudyEvent('accept_result', { action: 'insert_generated_code', code, code_event_id: entry.event.id });
          vscode.postMessage({
            type: 'insertGeneratedCode',
            code
          });
        },
        disabled: state.running || !codeEditable
      },
      {
        label: t('retestCode'),
        icon: 'retest',
        primary: true,
        onClick: function () {
          const code = codeDraftFor(entry.event, entry.code);
          if (code !== entry.code) {
            recordStudyEvent('code_edit', { action: 'retest_edited_code', code, code_event_id: entry.event.id });
          }
          recordStudyEvent('manual_retest', { action: 'retest_generated_code', code, code_event_id: entry.event.id });
          vscode.postMessage(Object.assign(currentActionPayload(), {
            type: 'retestGeneratedCode',
            code,
            codeEventId: entry.event.id
          }));
        },
        disabled: state.running || !codeEditable || !codeDraftFor(entry.event, entry.code).trim()
      }
    );

    card.appendChild(renderEditableCodeBlock(draft, 'python', 'Edit generated Python code here.', function (value) {
      state.codeDrafts[entry.event.id] = value;
    }, {
      editable: codeEditable,
      actions: codeActions
    }));
		appendGenerationDetails(card, entry.event && entry.event.data ? entry.event.data : {});

    if (entry.resultEvent) {
      const result = document.createElement('div');
      result.className = 'attempt-result';
      appendResultContent(result, entry.resultEvent, entry.isLatestEvaluate, entry.isLatestFailed, codeDraftFor(entry.event, entry.code), entry.code);
      card.appendChild(result);
    }

    return card;
  }

  function renderPlanCard(event, plan, editable) {
    const card = createCardFrame('plan', event);
    const planDraft = editable && state.editablePlanEventId === event.id
      ? state.editablePlanText
      : String(plan || '');

    if (!editable) {
      card.appendChild(renderPlanPreview(planDraft));
      return card;
    }

    if (state.editingPlanSource) {
      card.appendChild(renderEditableMarkdown(planDraft, function (value) {
        state.editablePlanText = value;
      }));
    } else {
      const preview = renderPlanPreview(planDraft);
      preview.title = 'Click to edit the markdown source.';
      preview.addEventListener('click', function () {
        if (state.running) {
          return;
        }
        state.editingPlanSource = true;
        renderTimeline();
      });
      card.appendChild(preview);
    }

    const row = createActionRow();
    row.appendChild(createButton(state.editingPlanSource ? 'Preview Plan' : 'Edit Markdown', 'secondary', function () {
      state.editingPlanSource = !state.editingPlanSource;
      renderTimeline();
    }, state.running));
    row.appendChild(createButton('Save Plan', 'secondary', function () {
      const submittedPlan = state.editablePlanEventId === event.id ? state.editablePlanText : planDraft;
      state.editingPlanSource = false;
      renderTimeline();
      vscode.postMessage({
        type: 'updateWorkflowPlan',
        plan: submittedPlan
      });
    }, state.running));
    row.appendChild(createButton('Regenerate Plan', 'secondary', function () {
      recordStudyEvent('regenerate_choice', { action: 'regenerate_plan' });
      vscode.postMessage(Object.assign({ type: 'continueWithFeedback' }, currentActionPayload()));
    }, state.running));
    row.appendChild(createButton('Next Step', '', function () {
      const submittedPlan = state.editablePlanEventId === event.id ? state.editablePlanText : planDraft;
      vscode.postMessage(Object.assign({
        type: 'continueWithPlan',
        planOverride: submittedPlan
      }, currentActionPayload()));
    }, state.running));
    row.appendChild(createButton('End Here', 'subtle', function () {
      vscode.postMessage({ type: 'stopInteractiveWorkflow' });
    }, state.running));
    card.appendChild(row);

    return card;
  }

  function renderNoteCard(event) {
    const card = createCardFrame('note', event);
    card.classList.add('note-card');
    card.appendChild(renderMarkdown(event.message || ''));
		appendGenerationDetails(card, event && event.data ? event.data : {});
    if (isAutoTestEditStage() && event && event.stage === 'auto') {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = 'Auto workflow is stopped. Use the setup area before resuming.';
      card.appendChild(hint);
    }
    return card;
  }

  function renderTestSetupPromptCard() {
    const generated = Boolean(state.session && state.session.test_mode === 'generate');
    const event = {
      title: t('tests'),
      stage: 'tests',
      status: 'ready',
      created_at: state.session ? state.session.updated_at : makeTimestamp()
    };
    const card = createCardFrame('note', event);
    card.classList.add('note-card', 'workflow-prompt-card');
    card.appendChild(renderMarkdown(t(generated ? 'testsGeneratedPrompt' : 'testsReadyPrompt')));
    const row = createActionRow('compact-card-actions');
    row.appendChild(createButton(t('reviewTests'), 'secondary', function () {
      recordStudyEvent('test_view', { action: 'review_tests' });
      focusTestSettings();
    }, state.running));
    row.appendChild(createButton(t('continue'), '', function () {
      if (state.running || !state.canResume || !configuredTestCode().trim()) return;
      const resumePayload = Object.assign({ type: 'resumeWorkflow' }, currentActionPayload());
      state.additionalInstructionPending = Boolean(resumePayload.additionalInstruction);
      postTrackedOperation('workflow', resumePayload);
    }, state.running || !state.canResume || !configuredTestCode().trim()));
    card.appendChild(row);
    return card;
  }

	function appendGenerationDetails(card, data) {
		if (!data || typeof data !== 'object') {
			return;
		}
		const generation = data.generation && typeof data.generation === 'object' ? data.generation : {};
		const usage = generation.usage && typeof generation.usage === 'object' ? generation.usage : {};
		const hasMetrics = Number.isFinite(generation.duration_ms) || Number.isFinite(usage.total_tokens);
		if (hasMetrics) {
			const metrics = document.createElement('details');
			metrics.className = 'message-details';
			const label = document.createElement('summary');
			label.textContent = uiLanguage === 'zh-CN' ? '模型调用信息' : 'Model call details';
			metrics.appendChild(label);
			const fields = [];
			if (Number.isFinite(generation.duration_ms)) fields.push('耗时：`' + generation.duration_ms + ' ms`');
			if (Number.isFinite(usage.input_tokens)) fields.push('输入：`' + usage.input_tokens + ' tokens`');
			if (Number.isFinite(usage.output_tokens)) fields.push('输出：`' + usage.output_tokens + ' tokens`');
			if (Number.isFinite(usage.total_tokens)) fields.push('合计：`' + usage.total_tokens + ' tokens`');
			metrics.appendChild(renderMarkdown(fields.join('  |  ')));
			card.appendChild(metrics);
		}
		if (typeof data.error === 'string' && data.error.trim()) {
			const error = document.createElement('div');
			error.className = 'card-subsection';
			const label = document.createElement('div');
			label.className = 'mini-heading';
			label.textContent = '失败原因';
			error.appendChild(label);
			error.appendChild(renderMarkdown(data.error));
			card.appendChild(error);
		}
		if (typeof data.raw_response === 'string' && data.raw_response.trim()) {
			const raw = document.createElement('details');
			raw.className = 'message-details';
			const label = document.createElement('summary');
			label.textContent = uiLanguage === 'zh-CN' ? '查看原始回答' : 'Raw model response';
			raw.appendChild(label);
			raw.appendChild(renderFencedCodeMarkdown(data.raw_response.trim(), 'text'));
			card.appendChild(raw);
		}
	}

	function renderStudyGuideCard() {
		if (!Array.isArray(state.studyTasks) || state.studyTasks.length === 0 || state.session) {
			return null;
		}
		const card = createCardFrame('note', { title: t('studyTask'), stage: 'study', status: 'ready', created_at: Date.now() });
		card.classList.add('note-card', 'workflow-prompt-card');
		card.appendChild(renderMarkdown(t('studyIntro')));
		const select = document.createElement('select');
		select.className = 'profile-select';
		select.setAttribute('aria-label', t('studyTask'));
		state.studyTasks.forEach(function (task) {
			const option = document.createElement('option');
			option.value = task.task_id;
			const order = Number.isInteger(task.sequence) ? (uiLanguage === 'zh-CN' ? '第 ' + task.sequence + ' 题 · ' : '#' + task.sequence + ' · ') : '';
			const condition = task.assigned_condition ? ' [' + (task.assigned_condition === 'auto' ? 'Auto' : 'Interactive') + ']' : '';
			option.textContent = order + task.task_id + condition + '：' + task.title;
			select.appendChild(option);
		});
		const selectedTaskExists = state.studyTasks.some(task => task.task_id === state.selectedStudyTaskId);
		state.selectedStudyTaskId = selectedTaskExists ? state.selectedStudyTaskId : state.studyTasks[0].task_id;
		select.value = state.selectedStudyTaskId;
		select.addEventListener('change', function () {
			state.selectedStudyTaskId = select.value;
		});
		card.appendChild(select);

		const modePicker = document.createElement('div');
		modePicker.className = 'study-mode-picker';
		const modeLabel = document.createElement('div');
		modeLabel.className = 'study-mode-label';
		modeLabel.textContent = t('studyMode');
		const modeGroup = document.createElement('div');
		modeGroup.className = 'study-mode-options';
		modeGroup.setAttribute('role', 'radiogroup');
		modeGroup.setAttribute('aria-label', t('studyMode'));
		[
			{ value: 'continue', label: 'Interactive' },
			{ value: 'auto', label: 'Auto' }
		].forEach(function (mode) {
			const button = document.createElement('button');
			const selected = executionModeSelect.value === mode.value;
			button.type = 'button';
			button.className = 'study-mode-option' + (selected ? ' selected' : '');
			button.textContent = mode.label;
			button.setAttribute('role', 'radio');
			button.setAttribute('aria-checked', selected ? 'true' : 'false');
			button.disabled = state.running;
			button.addEventListener('click', function () {
				state.workflowMode = mode.value;
				executionModeSelect.value = mode.value;
				renderSetupSummaries();
				syncActionButtons();
				renderTimeline();
			});
			modeGroup.appendChild(button);
		});
		modePicker.append(modeLabel, modeGroup);
		card.appendChild(modePicker);

		const loadTask = function () {
			const task = state.studyTasks.find(function (item) { return item.task_id === select.value; });
			if (!task) return null;
			state.selectedStudyTaskId = task.task_id;
			if (task.assigned_condition === 'auto' || task.assigned_condition === 'interactive') {
				state.workflowMode = task.assigned_condition === 'auto' ? 'auto' : 'continue';
				executionModeSelect.value = state.workflowMode;
			}
			problemInput.value = task.prompt;
			setEditableCodeText(testInput, task.public_tests);
			setEditableCodeText(resolvedTestsEditor, task.public_tests);
			testModeSelect.value = 'manual';
			state.problemDraftDirty = true;
			state.resolvedTestsDirty = true;
			vscode.postMessage({ type: 'loadStudyTask', taskId: task.task_id });
			renderAll();
			return task;
		};
		const row = createActionRow();
		row.appendChild(createButton(t('loadStudyTask'), 'secondary', function () { loadTask(); }, state.running));
		row.appendChild(createButton(t('startStudyTask'), '', function () {
			if (loadTask()) {
				vscode.postMessage(Object.assign({ type: 'runWorkflow' }, currentActionPayload()));
			}
		}, state.running));
		card.appendChild(row);
		return card;
	}

  function conversationEntries() {
    const entries = [];
    if (state.session && state.session.problem_statement) {
      entries.push({
        kind: 'session',
        id: 'session-' + state.session.session_id
      });
    }

    const events = sortedSessionEvents();
    const latestPlan = latestPlanEvent(events);
    const latestFailedEval = latestFailedEvaluateEvent(events);
    const latestEvaluate = latestEvaluateEvent(events);
    const attemptsById = new Map();
    let latestAttempt = null;
    let previousGuidance = '';

    events.forEach((event) => {
      const data = event.data || {};
      if ((event.stage === 'user_input' || event.stage === 'guidance') && event.status !== 'failed') {
        let content = typeof data.content === 'string' ? data.content : '';
        let inputKind = data.input_kind || 'guidance';
        if (typeof data.additional_instruction === 'string') {
          const cumulative = data.additional_instruction;
          if (!content) content = cumulative.startsWith(previousGuidance)
            ? cumulative.slice(previousGuidance.length).trim() : cumulative;
          previousGuidance = cumulative;
        } else if (typeof data.test_description === 'string') {
          content = data.test_description;
          inputKind = 'testGoals';
        }
        if (content.trim()) entries.push({kind: 'user-input', id: event.id, event, content, inputKind});
        return;
      }
      const code = typeof data.code === 'string' ? data.code : '';
      const plan = getPlanText(event, '');
      const isPlanEvent = event.stage === 'plan' && (event.status === 'completed' || event.status === 'ready') && Boolean(plan);
      const isCodeEvent = (event.stage === 'generate' || event.stage === 'regenerate' || event.stage === 'debug_fix')
        && event.status === 'completed'
        && Boolean(code.trim());
      const isResultEvent = event.stage === 'evaluate' && (event.status === 'completed' || event.status === 'failed');

      if (event.stage === 'tests' || event.stage === 'session') {
        return;
      }

      if (isCodeEvent) {
        const entry = {
          kind: 'attempt',
          id: event.id,
          event,
          code,
          resultEvent: null,
          isLatestEvaluate: false,
          isLatestFailed: false
        };
        attemptsById.set(event.id, entry);
        latestAttempt = entry;
        entries.push(entry);
        return;
      }

      if (isResultEvent) {
        const codeEventId = typeof data.code_event_id === 'string' ? data.code_event_id : '';
        const targetAttempt = (codeEventId && attemptsById.get(codeEventId)) || latestAttempt;
        if (targetAttempt) {
          targetAttempt.id = targetAttempt.event.id + ':' + event.id;
          targetAttempt.resultEvent = event;
          targetAttempt.isLatestEvaluate = Boolean(latestEvaluate && latestEvaluate.id === event.id);
          targetAttempt.isLatestFailed = Boolean(latestFailedEval && latestFailedEval.id === event.id && !state.session.passed);
          return;
        }

        entries.push({
          kind: 'result',
          id: event.id,
          event,
          isLatestEvaluate: Boolean(latestEvaluate && latestEvaluate.id === event.id),
          isLatestFailed: Boolean(latestFailedEval && latestFailedEval.id === event.id && !state.session.passed)
        });
        return;
      }

      if (isPlanEvent) {
        entries.push({
          kind: 'plan',
          id: event.id,
          event,
          plan,
          editable: Boolean(
            latestPlan
            && latestPlan.id === event.id
            && state.workflowMode === 'continue'
            && state.interactiveState === 'await_plan'
            && isInteractiveSelected()
          )
        });
        return;
      }

      if (event.stage === 'auto' || event.status === 'failed') {
        entries.push({
          kind: 'note',
          id: event.id,
          event
        });
      }
    });

    if (state.session && (isTestSetupStage() || isGenerationTestStage())) {
      entries.push({
        kind: 'test-setup',
        id: 'test-setup-' + state.session.session_id
      });
    }

    return entries;
  }


  function renderConversationEntry(entry) {
    if (entry.kind === 'session') return renderSessionCard();
    if (entry.kind === 'user-input') {
      const card = createCardFrame('session', entry.event);
      card.classList.add('user-card');
      const label = document.createElement('div');
      label.className = 'user-input-receipt';
      const key = { guidance: 'savedGuidance', requirement: 'savedRequirement',
        plan: 'savedPlan', testGoals: 'savedTestGoals' }[entry.inputKind] || 'savedGuidance';
      label.textContent = t(key);
      card.appendChild(label);
      card.appendChild(renderMarkdown(entry.content));
      return card;
    }
    if (entry.kind === 'attempt') return renderAttemptCard(entry);
    if (entry.kind === 'result') return renderResultCard(entry.event, entry.isLatestEvaluate, entry.isLatestFailed);
    if (entry.kind === 'plan') return renderPlanCard(entry.event, entry.plan, entry.editable);
    if (entry.kind === 'test-setup') return renderTestSetupPromptCard();
    return renderNoteCard(entry.event);
  }

  function renderArchivedSession(session, index) {
    const group = document.createElement('section');
    group.className = 'ada-archived-session';
    group.style.cssText = 'padding:0 0 12px;margin:0 0 14px;border-bottom:1px solid var(--vscode-panel-border);';
    const divider = document.createElement('div');
    divider.style.cssText = 'display:flex;align-items:center;gap:10px;margin:12px 0;color:var(--vscode-descriptionForeground);';
    const heading = document.createElement('span');
    heading.textContent = (uiLanguage === 'zh-CN' ? '任务 ' : 'Task ') + (index + 1)
      + (session.passed ? ' ✓' : '');
    divider.appendChild(heading);
    group.appendChild(divider);

    // Reuse exactly the live conversation renderer, with a read-only snapshot of its state.
    const saved = {
      session: state.session, running: state.running, workflowMode: state.workflowMode,
      interactiveState: state.interactiveState, canResume: state.canResume,
      codeDrafts: state.codeDrafts, testDrafts: state.testDrafts
    };
    try {
      state.session = session;
      state.running = true;
      state.workflowMode = 'auto';
      state.interactiveState = 'idle';
      state.canResume = false;
      state.codeDrafts = {};
      state.testDrafts = {};
      conversationEntries().filter(entry => entry.kind !== 'test-setup').forEach(entry => {
        const card = renderConversationEntry(entry);
        if (!card) return;
        card.querySelectorAll('button, input, textarea, select').forEach(control => {
          control.disabled = true;
        });
        card.querySelectorAll('[contenteditable]').forEach(node => {
          node.setAttribute('contenteditable', 'false');
        });
        group.appendChild(card);
      });
    } finally {
      Object.assign(state, saved);
    }
    return group;
  }

  function renderArchivedHistory() {
    (state.archivedSessions || []).forEach((session, index) => {
      timeline.appendChild(renderArchivedSession(session, index));
    });
  }

  function animateToNewTask() {
    if (!conversationScroll || !state.archiveTransitionPending) return;
    state.archiveTransitionPending = false;
    const anchor = timeline.querySelector('.ada-new-task-anchor');
    if (!anchor) return;
    const target = Math.max(0, anchor.getBoundingClientRect().top
      - conversationScroll.getBoundingClientRect().top + conversationScroll.scrollTop - 12);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(function () {
      conversationScroll.scrollTo({ top: target, behavior: reduced ? 'instant' : 'smooth' });
    });
  }

  function appendNewTaskAnchor() {
    if (!(state.archivedSessions || []).length) return;
    const anchor = document.createElement('div');
    anchor.className = 'ada-new-task-anchor';
    anchor.textContent = uiLanguage === 'zh-CN'
      ? '新任务 · 输入需求以开始'
      : 'New task · Enter a requirement to begin';
    timeline.appendChild(anchor);
    // Provide enough room to scroll old history above the visible viewport
    // even before the new task contains its first message.
    if (!state.session) {
      anchor.style.minHeight = Math.max(0, conversationScroll.clientHeight - 28) + 'px';
    }
  }

  function renderTimeline() {
    syncEditablePlanDraft();
    const entries = conversationEntries();
    const timelineSignature = entries.map((entry) => entry.id).join('|');
    const hasTimelineChange = timelineSignature !== state.lastTimelineSignature;
    const shouldStickToBottom = state.autoScrollPinned
      || isNearConversationBottom()
      || hasTimelineChange;

    timeline.innerHTML = '';
    renderArchivedHistory();
    appendNewTaskAnchor();
    state.lastTimelineSignature = timelineSignature;

    if (entries.length === 0 && !(state.archivedSessions || []).length) {
			const guide = renderStudyGuideCard();
			if (guide) {
				timeline.appendChild(guide);
				requestConversationAutoScroll();
				return;
			}
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = t('noConversation');
      timeline.appendChild(empty);
      if (shouldStickToBottom) {
        requestConversationAutoScroll();
      }
      return;
    }

    entries.forEach(entry => {
      const card = renderConversationEntry(entry);
      if (card) timeline.appendChild(card);
    });

    renderPassedTaskDecision();
    if (state.archiveTransitionPending) {
      animateToNewTask();
    } else if (shouldStickToBottom || awaitingTaskConfirmation()) {
      requestConversationAutoScroll();
    }
  }

  function renderProfileOptions() {
    const currentSettings = state.editingProfileId || settingsProfileSelect.value;

    taskProfileSelect.innerHTML = '';
    settingsProfileSelect.innerHTML = '';

    const draftOption = document.createElement('option');
    draftOption.value = NEW_PROFILE_DRAFT_ID;
    draftOption.textContent = t('createNewProfile');
    settingsProfileSelect.appendChild(draftOption);

    state.profiles.forEach((profile) => {
      const taskOption = document.createElement('option');
      taskOption.value = profile.id;
      taskOption.textContent = profile.name;
      taskOption.title = profile.model + ' · ' + profile.name + ' (' + profile.provider + ')';
      taskProfileSelect.appendChild(taskOption);

      const settingsOption = document.createElement('option');
      settingsOption.value = profile.id;
      settingsOption.textContent = profile.name;
      settingsProfileSelect.appendChild(settingsOption);
    });

    if (!state.profiles.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('noProfile');
      taskProfileSelect.appendChild(option);
    }

    const active = state.activeProfileId || (state.profiles[0] && state.profiles[0].id) || '';
    taskProfileSelect.value = active;
    renderModelPicker();
    settingsProfileSelect.value = currentSettings === NEW_PROFILE_DRAFT_ID
      ? NEW_PROFILE_DRAFT_ID
      : (state.profiles.some((item) => item.id === currentSettings) ? currentSettings : (active || NEW_PROFILE_DRAFT_ID));
  }

  function renderProfileEditStatus() {
    if (!profileEditStatus) return;
    const key = state.profileSaving ? 'profileSavingStatus'
      : state.profileStatusOverride || (state.profileDirty ? 'profileUnsaved' : 'profileReady');
    profileEditStatus.textContent = t(key);
    profileEditStatus.classList.toggle('is-dirty', state.profileDirty && !state.profileSaving);
    profileEditStatus.classList.toggle('is-saving', state.profileSaving);
    if (discardProfileChangesBtn) discardProfileChangesBtn.classList.toggle('hidden', !state.profileDirty);
    if (saveProfileBtn) saveProfileBtn.disabled = state.profileSaving;
  }

  function markProfileDirty() {
    state.profileDirty = true;
    state.profileStatusOverride = '';
    renderProfileEditStatus();
  }

  function requireCleanProfile() {
    if (!state.profileDirty && !state.profileSaving) return true;
    state.profileStatusOverride = 'profileChangesBlocked';
    renderProfileEditStatus();
    return false;
  }

  function updateProviderFieldHints() {
    const local = ['vllm', 'ollama', 'other'].includes(profileProviderSelect.value);
    if (profileEndpointHint) {
      profileEndpointHint.textContent = t(local ? 'profileEndpointRequired' : 'endpointOptionalHint');
    }
    if (profileKeyHint) {
      profileKeyHint.textContent = t(local ? 'keyOptionalHint' : 'apiKeyHint');
    }
  }

  function renderWorkflowModelSummary() {
    if (!workflowModelSummary) return;
    const profile = selectedProfile();
    workflowModelSummary.textContent = profile
      ? profile.name + ' · ' + profile.model + ' · '
        + (profile.maxTokens || 1024).toLocaleString() + ' tokens'
      : t('noProfile');
  }

  function updateCompletionFieldsState() {
    const enabled = Boolean(inlineCompletionEnabledInput && inlineCompletionEnabledInput.checked);
    const manual = inlineCompletionTriggerModeSelect
      && inlineCompletionTriggerModeSelect.value === 'manual';
    [inlineCompletionProviderSelect, inlineCompletionBaseUrlInput,
      inlineCompletionModelInput, inlineCompletionTriggerModeSelect,
      inlineCompletionMaxTokensInput].forEach(function (element) {
        if (element) element.disabled = !enabled;
    });
    if (inlineCompletionDebounceInput) inlineCompletionDebounceInput.disabled = !enabled || manual;
    if (completionServiceGroup) completionServiceGroup.classList.toggle('is-inactive', !enabled);
    if (completionBehaviorGroup) completionBehaviorGroup.classList.toggle('is-inactive', !enabled);
  }

  function loadProfileEditor() {
    state.profileDirty = false;
    state.profileSaving = false;
    state.profileStatusOverride = '';
    renderProfileEditStatus();
    updateProviderFieldHints();
    const isNewDraft = !state.editingProfileId || state.editingProfileId === NEW_PROFILE_DRAFT_ID;
    if (deleteProfileBtn) {
      deleteProfileBtn.disabled = isNewDraft;
    }

    if (isNewDraft) {
      profileNameInput.value = t('newProfileName');
      profileBaseUrlInput.value = '';
      profileModelInput.value = 'gpt-5.4';
      profileMaxTokensInput.value = '1024';
      profileProviderSelect.value = 'other';
      profileApiKeyInput.value = '';
      profileApiKeyInput.placeholder = 'sk-...';
      profileHint.textContent = t('newProfileHint');
      updateProviderFieldHints();
      return;
    }

    const profile = findProfile(state.editingProfileId);
    if (!profile) {
      if (deleteProfileBtn) {
        deleteProfileBtn.disabled = true;
      }
      profileNameInput.value = '';
      profileBaseUrlInput.value = '';
      profileModelInput.value = 'gpt-5.4';
      profileMaxTokensInput.value = '1024';
      profileProviderSelect.value = 'other';
      profileApiKeyInput.value = '';
      profileApiKeyInput.placeholder = 'sk-...';
      profileHint.textContent = t('profileNotFound');
      updateProviderFieldHints();
      return;
    }

    profileNameInput.value = profile.name;
    profileBaseUrlInput.value = profile.baseUrl;
    profileModelInput.value = profile.model;
    profileMaxTokensInput.value = String(profile.maxTokens || 1024);
    profileProviderSelect.value = profile.provider || 'other';
    profileApiKeyInput.value = '';
    profileApiKeyInput.placeholder = profile.apiKeyConfigured
      ? t('keepStoredKey')
      : 'sk-...';
    profileHint.textContent = profile.apiKeyConfigured
      ? t('keyStored')
      : t('keyEmpty');
    if (deleteProfileBtn) {
      deleteProfileBtn.disabled = false;
    }
    updateProviderFieldHints();
  }

  function startNewProfile(returnToTask) {
    if (!requireCleanProfile()) return;
    state.editingProfileId = NEW_PROFILE_DRAFT_ID;
    state.returnToTaskAfterSave = returnToTask;
    loadProfileEditor();
    switchPage('settings');
    renderAll();
  }

  function syncResolvedTestsEditor(force) {
    const activeSessionId = state.session && state.session.session_id ? state.session.session_id : '';
    const sessionChanged = activeSessionId !== state.lastSessionId;
    const incoming = state.session
      ? (state.session.test_text || state.session.resolved_test_code || '')
      : '';

    if (force || sessionChanged || !state.resolvedTestsDirty || incoming === configuredTestCode()) {
      setEditableCodeText(testInput, incoming);
      setEditableCodeText(resolvedTestsEditor, incoming);
      state.resolvedTestsDirty = false;
    }

    state.lastSessionId = activeSessionId;
    refreshEditableCodeBlocks();
  }

  function syncLayout() {
    if (manualTestsSection) {
      manualTestsSection.classList.remove('hidden');
    }
    if (testsWorkspaceSection) {
      testsWorkspaceSection.classList.add('hidden');
    }
  }

  function renderSetupSummaries() {
    if (modelSummary) {
      const profile = selectedProfile();
      const profileName = profile ? profile.name : t('noProfile');
      const modeLabel = executionModeSelect.value === 'continue' ? t('interactive') : t('auto');
      const issue = profileConfigIssue();
      modelSummary.textContent = modeLabel + ' / ' + profileName + (issue ? ' / ' + t('setupNeeded') : '') + (contextEnabledInput.checked ? ' / ' + t('contextOn') : ' / ' + t('contextOff'));
    }
    if (testsSummary) {
      testsSummary.textContent = configuredTestCode().trim() ? t('testsConfigured') : t('autoGenerateTests');
    }
  }

  function primaryWorkflowAction() {
    if (state.running) {
      return 'stop';
    }
    if (state.canResume) {
      return 'continue';
    }
    return 'send';
  }

  function isLockedInteractiveSend() {
    return false;
  }

  function renderPrimaryActionButton(hasResolvedTestsDraft) {
    if (!submitWorkflowBtn || !submitWorkflowIcon || !submitWorkflowLabel) {
      return;
    }

    const action = primaryWorkflowAction();
    const actionMeta = {
      send: {
        label: state.session
          ? (isInteractiveSelected() ? t('addInstruction') : t('autoModeLocked'))
          : t('send'),
        title: t('sendWorkflow'),
        icon: sendIconSrc
      },
      continue: {
        label: t('continue'),
        title: t('continueWorkflow'),
        icon: continueIconSrc
      },
      stop: {
        label: state.interruptRequested ? t('stopping') : t('stop'),
        title: t('stopWorkflow'),
        icon: stopIconSrc
      }
    }[action];

    const lockedInteractive = false;
    submitWorkflowBtn.classList.toggle('is-send', action === 'send');
    submitWorkflowBtn.classList.toggle('is-continue', action === 'continue');
    submitWorkflowBtn.classList.toggle('is-stop', action === 'stop');
    const accessibleLabel = action === 'send' ? actionMeta.label : actionMeta.title;
    submitWorkflowBtn.title = accessibleLabel;
    submitWorkflowBtn.setAttribute('aria-label', accessibleLabel);
    submitWorkflowIcon.src = actionMeta.icon;
    submitWorkflowLabel.textContent = actionMeta.label;
    submitWorkflowBtn.disabled = awaitingTaskConfirmation() || lockedInteractive
      || (action === 'stop'
        ? Boolean(state.interruptRequested)
        : action === 'continue'
          ? Boolean(state.running || state.operationStatus === 'running' || !hasResolvedTestsDraft)
          : Boolean(state.running || state.operationStatus === 'running' || !problemInput.value.trim()));
  }

  function renderProfileNotice() {
    if (!profileNotice || !profileNoticeText) {
      return;
    }
    const issue = profileConfigIssue();
    profileNotice.classList.toggle('hidden', !issue);
    profileNoticeText.textContent = issue || '';
  }

	function environmentSummary(status) {
		if (status === 'ready') {
			return t('environmentReady');
		}
		if (status === 'warning') {
			return t('environmentWarning');
		}
		if (status === 'failed') {
			return t('environmentFailed');
		}
		return t('checkingEnvironment');
	}

  function renderEnvironmentStatus() {
		if (!environmentStatus || !environmentStatusSummary || !environmentCheckList) {
			return;
		}
		const check = state.environmentCheck || { status: 'checking', items: [], checkedAt: '' };
		const status = ['ready', 'warning', 'failed'].includes(check.status) ? check.status : 'checking';
		environmentStatus.className = 'environment-status ' + status;
		environmentStatusSummary.textContent = environmentSummary(status)
			+ (check.checkedAt ? ' · ' + check.checkedAt : '');
		environmentCheckList.replaceChildren();
		(Array.isArray(check.items) ? check.items : []).forEach(function (item) {
			const row = document.createElement('li');
			row.className = 'environment-check-item ' + (item.status || 'checking');
			const label = document.createElement('span');
			label.className = 'environment-check-label';
			label.textContent = String(item.label || '');
			const detail = document.createElement('span');
			detail.className = 'environment-check-detail';
			detail.textContent = String(item.detail || '');
			row.append(label, detail);
			environmentCheckList.appendChild(row);
		});
		if (checkEnvironmentBtn) {
			checkEnvironmentBtn.disabled = status === 'checking';
		}
	}

	function renderPythonInterpreter() {
		if (!pythonInterpreterValue) {
			return;
		}
		pythonInterpreterValue.textContent = String(state.pythonEnvironmentLabel || (state.pythonPath === 'auto' ? t('autoDetectPython') : state.pythonPath) || t('autoDetectPython'));
	}

  function renderInlineCompletionSettings() {
    const settings = state.inlineCompletion;
    if (!settings) return;
    if (!state.inlineSettingsDirty && !state.inlineSettingsSaving) {
      if (inlineCompletionEnabledInput) inlineCompletionEnabledInput.checked = settings.enabled !== false;
      if (inlineCompletionProviderSelect) inlineCompletionProviderSelect.value = settings.provider || 'vllm';
      if (inlineCompletionTriggerModeSelect) inlineCompletionTriggerModeSelect.value =
        settings.triggerMode === 'manual' ? 'manual' : 'automatic';
      if (inlineCompletionBaseUrlInput) inlineCompletionBaseUrlInput.value = settings.baseUrl || '';
      if (inlineCompletionModelInput) inlineCompletionModelInput.value = settings.model || '';
      if (inlineCompletionDebounceInput) inlineCompletionDebounceInput.value = String(settings.debounceMs || 700);
      if (inlineCompletionMaxTokensInput) inlineCompletionMaxTokensInput.value = String(settings.maxTokens || 192);
    }
    updateCompletionFieldsState();
    if (saveInlineCompletionBtn) saveInlineCompletionBtn.disabled = state.inlineSettingsSaving;
    if (inlineCompletionStatus) {
      inlineCompletionStatus.textContent = state.inlineSettingsSaving ? t('profileSavingStatus')
        : state.inlineSettingsDirty ? t('inlineSettingsUnsaved')
        : state.inlineSaveStatus ? t(state.inlineSaveStatus)
        : settings.enabled === false ? t('disabled')
        : `${settings.model || 'unknown'} @ ${settings.baseUrl || 'unknown'}`;
    }
  }

  function renderComposerStatus() {
    let text = '';
    let statusClass = '';

    if (state.running) {
      text = state.interruptRequested
        ? t('stoppingAfterStage')
        : (state.runningLabel || t('running'));
      statusClass = 'running';
    } else if (state.canResume) {
      text = state.resumeLabel || t('workflowPaused');
      statusClass = 'waiting';
    } else if (!state.session) {
      text = '';
    } else if (state.session.passed) {
      text = t('runPassed');
      statusClass = 'passed';
    } else if (state.workflowMode === 'continue' && state.interactiveState === 'await_plan') {
      text = t('pausedOnPlan');
      statusClass = 'waiting';
    } else if (isTestSetupStage()) {
      text = t('testsWaiting');
      statusClass = 'waiting';
    } else if (isCodeReviewStage()) {
      text = t('codeReady');
      statusClass = 'waiting';
    } else if (state.workflowMode === 'continue' && state.interactiveState === 'await_failure_choice') {
      text = t('resultWaiting');
      statusClass = 'waiting';
    } else if (isLockedInteractiveSend()) {
      text = t('interactiveControlled');
      statusClass = 'waiting';
    } else if (state.session.status === 'failed') {
      text = t('runFailed');
      statusClass = 'failed';
    }

    composerStatus.textContent = text;
    composerStatus.className = text
      ? 'composer-status visible ' + statusClass
      : 'composer-status';
    renderWorkflowProgress();
  }

  function workflowProgressTone() {
    if (state.workflowError || state.operationStatus === 'failed' || composerStatus.classList.contains('failed')) {
      return 'failed';
    }
    if (state.running) {
      return 'running';
    }
    if (state.session && state.session.passed) {
      return 'completed';
    }
    return 'waiting';
  }

  function workflowEventTone(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'failed' || normalized === 'error') {
      return 'failed';
    }
    if (normalized === 'running' || normalized === 'started' || normalized === 'pending') {
      return 'running';
    }
    if (normalized === 'completed' || normalized === 'passed' || normalized === 'succeeded' || normalized === 'ready') {
      return 'completed';
    }
    return 'waiting';
  }

  function workflowToneLabel(tone) {
    const labels = uiLanguage === 'zh-CN'
      ? { completed: '已完成', failed: '失败', running: '进行中', waiting: '等待确认' }
      : { completed: 'Completed', failed: 'Failed', running: 'In progress', waiting: 'Waiting for review' };
    return labels[tone] || labels.waiting;
  }

  function workflowStageLabel(stage) {
    const labels = uiLanguage === 'zh-CN'
      ? {
          session: '准备任务', tests: '准备测试', generate: '生成代码', evaluate: '运行测试',
          plan: '生成修复计划', regenerate: '重新生成代码', debug_fix: '自动修复',
          auto: '自动工作流', guidance: '更新要求', client: '界面操作', code: '审查代码', interactive: '交互流程'
        }
      : {
          session: 'Prepare', tests: 'Tests', generate: 'Generate', evaluate: 'Validate',
          plan: 'Plan repair', regenerate: 'Regenerate', debug_fix: 'Quick fix',
          auto: 'Auto workflow', guidance: 'Update request', client: 'UI action', code: 'Review code', interactive: 'Interactive workflow'
        };
    return labels[String(stage || '')] || String(stage || (uiLanguage === 'zh-CN' ? '工作流' : 'Workflow')).replaceAll('_', ' ');
  }

  function workflowCurrentLabel() {
    if (state.running) {
      return state.session && state.session.current_stage
        ? workflowStageLabel(state.session.current_stage)
        : (uiLanguage === 'zh-CN' ? '执行中' : 'Running');
    }
    if (state.session && state.session.passed) {
      return uiLanguage === 'zh-CN' ? '完成' : 'Complete';
    }
    if (isTestSetupStage() || isGenerationTestStage()) {
      return uiLanguage === 'zh-CN' ? '审查测试' : 'Review tests';
    }
    if (isCodeReviewStage()) {
      return uiLanguage === 'zh-CN' ? '审查代码' : 'Review code';
    }
    if (state.interactiveState === 'await_plan') {
      return uiLanguage === 'zh-CN' ? '审查计划' : 'Review plan';
    }
    if (state.interactiveState === 'await_failure_choice') {
      return uiLanguage === 'zh-CN' ? '处理失败' : 'Review failure';
    }
    if (state.session && state.session.current_stage) {
      return workflowStageLabel(state.session.current_stage);
    }
    return uiLanguage === 'zh-CN' ? '当前状态' : 'Current status';
  }

  function workflowDuration(event) {
    const data = event && event.data && typeof event.data === 'object' ? event.data : {};
    const generation = data.generation && typeof data.generation === 'object' ? data.generation : {};
    const evaluation = data.evaluation && typeof data.evaluation === 'object' ? data.evaluation : {};
    const milliseconds = [generation.duration_ms, evaluation.duration_ms, data.duration_ms]
      .find(function (value) { return Number.isFinite(value); });
    if (!Number.isFinite(milliseconds)) {
      return '';
    }
    const seconds = Number(milliseconds) / 1000;
    return seconds < 1 ? '<1s' : Math.round(seconds) + 's';
  }

  let workflowStepTooltip = null;

  function hideWorkflowStepTooltip() {
    if (workflowStepTooltip) workflowStepTooltip.hidden = true;
  }

  function workflowProgressFacts(event) {
    const data = event && event.data && typeof event.data === 'object' ? event.data : {};
    const generation = data.generation && typeof data.generation === 'object' ? data.generation : {};
    const usage = generation.usage && typeof generation.usage === 'object' ? generation.usage : {};
    const evaluation = data.evaluation && typeof data.evaluation === 'object' ? data.evaluation : {};
    const testSummary = evaluation.test_summary && typeof evaluation.test_summary === 'object'
      ? evaluation.test_summary
      : (data.test_summary && typeof data.test_summary === 'object' ? data.test_summary : {});
    const label = function (zh, en) { return uiLanguage === 'zh-CN' ? zh : en; };
    const facts = [];
    const add = function (name, value) {
      if (value !== undefined && value !== null && String(value).trim()) {
        facts.push([name, String(value)]);
      }
    };
    add(label('时间', 'Time'), logTimestamp(event.created_at));
    add(label('耗时', 'Duration'), workflowDuration(event));
    if (typeof generation.strategy === 'string') add(label('生成策略', 'Strategy'), generation.strategy);
    if (Number.isFinite(generation.max_output_tokens)) {
      add(label('输出上限', 'Output limit'), generation.max_output_tokens + ' tokens');
    }
    if (Number.isFinite(usage.input_tokens)) add(label('输入 Tokens', 'Input tokens'), usage.input_tokens);
    if (Number.isFinite(usage.output_tokens)) add(label('输出 Tokens', 'Output tokens'), usage.output_tokens);
    if (Number.isFinite(usage.total_tokens)) add(label('总 Tokens', 'Total tokens'), usage.total_tokens);
    if (Number.isFinite(testSummary.total)) {
      add(label('公开测试', 'Public tests'),
        (Number.isFinite(testSummary.passed) ? testSummary.passed : '?') + '/' + testSummary.total);
      if (Number.isFinite(testSummary.pass_rate)) {
        add(label('通过率', 'Pass rate'), Math.round(testSummary.pass_rate * 100) + '%');
      }
    }
    if (data.code && typeof data.code === 'string') {
      add(label('生成代码', 'Generated code'),
        data.code.split('\\n').length + ' ' + label('行', 'lines'));
    }
    const excerpt = function (value, limit) {
      return typeof value === 'string' ? value.trim().slice(0, limit) : '';
    };
    const error = excerpt(data.error || evaluation.error || data.traceback || evaluation.traceback, 340);
    const plan = excerpt(data.plan, 260);
    const code = excerpt(data.code, 240);
    return {
      facts,
      note: error ? { label: label('失败信息', 'Failure details'), text: error } :
        plan ? { label: label('修复计划', 'Repair plan'), text: plan } :
        code ? { label: label('代码预览', 'Code preview'), text: code } : null
    };
  }

  function showWorkflowStepTooltip(entry, source) {
    if (!state.workflowProgressExpanded) return;
    if (!workflowStepTooltip) {
      workflowStepTooltip = document.createElement('div');
      workflowStepTooltip.className = 'workflow-step-tooltip';
      workflowStepTooltip.setAttribute('role', 'tooltip');
      document.body.appendChild(workflowStepTooltip);
    }
    const tooltip = workflowStepTooltip;
    tooltip.replaceChildren();
    const title = document.createElement('div');
    title.className = 'workflow-step-tooltip-title';
    title.textContent = entry.title;
    const status = document.createElement('div');
    status.className = 'workflow-step-tooltip-status';
    status.textContent = entry.statusLabel + (entry.detail ? ' · ' + entry.detail : '');
    tooltip.append(title, status);
    const info = workflowProgressFacts(entry.event);
    if (info.facts.length) {
      const facts = document.createElement('div');
      facts.className = 'workflow-step-tooltip-facts';
      info.facts.forEach(function (pair) {
        const key = document.createElement('span');
        key.className = 'workflow-step-tooltip-label';
        key.textContent = pair[0];
        const value = document.createElement('span');
        value.className = 'workflow-step-tooltip-value';
        value.textContent = pair[1];
        facts.append(key, value);
      });
      tooltip.appendChild(facts);
    }
    if (info.note) {
      const section = document.createElement('div');
      section.className = 'workflow-step-tooltip-section';
      const noteLabel = document.createElement('div');
      noteLabel.className = 'workflow-step-tooltip-label';
      noteLabel.textContent = info.note.label;
      const note = document.createElement('div');
      note.className = 'workflow-step-tooltip-note';
      note.textContent = info.note.text;
      section.append(noteLabel, note);
      tooltip.appendChild(section);
    }

    const bounds = source.getBoundingClientRect();
    const heading = source.querySelector('.workflow-progress-item-heading');
    const headingBounds = heading ? heading.getBoundingClientRect() : bounds;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const margin = 12;

    // Fly out to the RIGHT of the stage labels, rather than above the item.
    // Workflow rows occupy the full width of the panel, so anchor inside their
    // right-hand area instead of using bounds.right (which would be offscreen).
    const minWidth = Math.min(180, Math.max(120, viewportWidth - margin * 2));
    const preferredX = Math.max(
      headingBounds.left + Math.min(240, bounds.width * 0.42),
      headingBounds.left + 140
    );
    const maxX = Math.max(margin, viewportWidth - margin - minWidth);
    const x = Math.max(margin, Math.min(preferredX, maxX));
    tooltip.style.width = Math.min(340, viewportWidth - x - margin) + 'px';
    tooltip.style.left = x + 'px';

    tooltip.hidden = false;
    const tooltipHeight = tooltip.getBoundingClientRect().height;
    // Align vertically with the hovered stage, with only viewport clamping.
    const y = Math.max(margin, Math.min(bounds.top + 2, viewportHeight - tooltipHeight - margin));
    tooltip.style.top = y + 'px';
  }

  window.addEventListener('scroll', hideWorkflowStepTooltip, true);
  window.addEventListener('resize', hideWorkflowStepTooltip);

  function workflowProgressEntries() {
    return sortedSessionEvents().map(function (event) {
      const tone = workflowEventTone(event.status);
      return {
        id: event.id,
        event,
        title: workflowStageLabel(event.stage),
        detail: String(event.message || event.title || ''),
        tone,
        statusLabel: workflowToneLabel(tone),
        duration: workflowDuration(event)
      };
    });
  }

  function renderWorkflowProgress() {
    if (!workflowProgress || !workflowProgressToggle || !workflowProgressPopover || !workflowProgressList || !workflowProgressCurrentTitle || !workflowProgressCurrentDetail || !workflowProgressMarker) {
      return;
    }
    hideWorkflowStepTooltip();
    const composerText = String(composerStatus.textContent || '').trim();
    const currentText = state.workflowError
      ? state.workflowError
      : state.running
        ? (state.runningLabel || t('running'))
        : composerText || state.operationMessage || '';
    const visible = Boolean(state.session || state.running || state.workflowError);
    workflowProgress.hidden = !visible;
    if (!visible) {
      workflowProgressPopover.hidden = true;
      return;
    }

    const tone = workflowProgressTone();
    const currentTitle = workflowCurrentLabel();
    const currentStatus = workflowToneLabel(tone);
    workflowProgress.className = 'workflow-progress-anchor ' + tone + (state.workflowProgressExpanded ? ' expanded' : '');
    workflowProgressCurrentTitle.textContent = currentTitle;
    workflowProgressCurrentDetail.textContent = currentStatus + (currentText && currentText !== currentTitle ? ' · ' + currentText : '');
    workflowProgressMarker.className = 'workflow-progress-marker ' + tone;
    workflowProgressMarker.textContent = '';
    workflowProgressToggle.setAttribute('aria-expanded', state.workflowProgressExpanded ? 'true' : 'false');
    workflowProgressToggle.setAttribute('aria-label', (state.workflowProgressExpanded ? (uiLanguage === 'zh-CN' ? '收起' : 'Collapse') : (uiLanguage === 'zh-CN' ? '展开' : 'Expand')) + ' ' + t('workflowProgress') + ': ' + currentTitle + ', ' + currentStatus + (currentText ? ', ' + currentText : ''));
    workflowProgressPopover.hidden = !state.workflowProgressExpanded;

    workflowProgressList.replaceChildren();
    const entries = workflowProgressEntries();
    workflowProgress.classList.toggle('has-history', entries.length > 0);
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'workflow-progress-empty';
      empty.textContent = t('noWorkflowHistory');
      workflowProgressList.appendChild(empty);
      return;
    }
    entries.forEach(function (entry) {
      const item = document.createElement('li');
      item.className = 'workflow-progress-item ' + entry.tone;
      item.tabIndex = 0;
      item.setAttribute('aria-label', [entry.title, entry.statusLabel, entry.detail].filter(Boolean).join('. '));
      item.addEventListener('mouseenter', function () { showWorkflowStepTooltip(entry, item); });
      item.addEventListener('mouseleave', hideWorkflowStepTooltip);
      item.addEventListener('focus', function () { showWorkflowStepTooltip(entry, item); });
      item.addEventListener('blur', hideWorkflowStepTooltip);
      const marker = document.createElement('span');
      marker.className = 'workflow-progress-item-marker';
      marker.setAttribute('aria-label', entry.statusLabel);
      const content = document.createElement('span');
      content.className = 'workflow-progress-item-content';
      const titleRow = document.createElement('span');
      titleRow.className = 'workflow-progress-item-heading';
      const title = document.createElement('span');
      title.className = 'workflow-progress-item-title';
      title.textContent = entry.title;
      const status = document.createElement('span');
      status.className = 'workflow-progress-item-status';
      status.textContent = entry.statusLabel;
      const detail = document.createElement('span');
      detail.className = 'workflow-progress-item-detail';
      detail.textContent = entry.detail;
      titleRow.append(title, status);
      content.append(titleRow, detail);
      item.append(marker, content);
      if (entry.duration) {
        const duration = document.createElement('span');
        duration.className = 'workflow-progress-duration';
        duration.textContent = entry.duration;
        item.appendChild(duration);
      }
      workflowProgressList.appendChild(item);
    });
  }

  function renderResolvedTestsHint() {
    if (!state.session) {
      resolvedTestsHint.textContent = t('testsCompactEmpty');
      syncResolvedTestsEditor(false);
      return;
    }

    resolvedTestsHint.textContent = state.resolvedTestsDirty
      ? t('testsCompactDirty')
      : t('testsCompactReady');
    syncResolvedTestsEditor(false);
  }

  function composerPlaceholder() {
    if (state.running) return t('runningInputPlaceholder');
    if (!state.session) return t('problemPlaceholder');
    if (!isInteractiveSelected()) return t('autoLockedPlaceholder');
    if (isTestSetupStage() || isGenerationTestStage()) return t('testsInputPlaceholder');
    if (state.interactiveState === 'await_plan') return t('planInputPlaceholder');
    if (state.interactiveState === 'await_failure_choice') return t('failureInputPlaceholder');
    if (isCodeReviewStage()) return t('codeInputPlaceholder');
    return t('additionalInstructionPlaceholder');
  }

  function updateTestsIconState(button, busy, labelKey, busyKey) {
    const label = t(busy ? busyKey : labelKey);
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-busy', String(busy));
  }

  function syncComposerMode() {
    const locked = state.running || Boolean(state.session);
    const currentMode = executionModeSelect.value === 'auto' ? 'auto' : 'continue';
    if (composerModeRow) composerModeRow.classList.toggle('is-locked', locked);
    [[composerInteractiveModeBtn, 'continue', 'interactiveHint'],
      [composerAutoModeBtn, 'auto', 'autoHint']].forEach(function (setting) {
      const button = setting[0];
      if (!button) return;
      const active = currentMode === setting[1];
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = locked;
      button.title = locked ? t('composerModeLocked') : t(setting[2]);
    });
  }

  function syncActionButtons() {
    const hasSession = Boolean(state.session);
    const taskPassed = Boolean(state.session && state.session.passed);
    const hasProblemDraft = Boolean(problemInput.value.trim());
    const hasResolvedTestsDraft = Boolean(configuredTestCode().trim());
    const interactiveSession = hasSession && isInteractiveSelected();
    const guidanceEditable = !state.running && (!hasSession || interactiveSession || taskPassed) && !awaitingTaskConfirmation();
    const testsEditable = !state.running && (!hasSession || interactiveSession);
    const testsBusy = state.testOperationStatus === 'running';

    problemInput.readOnly = !guidanceEditable;
    problemInput.classList.toggle('locked-input', !guidanceEditable);
    problemInput.placeholder = composerPlaceholder();
    if (workflowModeHint) {
      workflowModeHint.textContent = isInteractiveSelected() ? t('interactiveHint') : t('autoHint');
    }
    executionModeSelect.disabled = state.running || hasSession;
    syncComposerMode();
    taskProfileSelect.disabled = state.running || hasSession || !state.profiles.length;
    const currentProfile = selectedProfile();
    taskProfileSelect.title = (currentProfile ? currentProfile.name + '\n' : '')
      + t(state.running || hasSession ? 'modelLockedHint' : 'modelSelectHint');
    modelPickerButton.disabled = taskProfileSelect.disabled;
    modelPickerButton.title = taskProfileSelect.title;
    if (modelPickerButton.disabled) closeModelPicker(false);
    if (testInput) {
      testInput.setAttribute('contenteditable', testsEditable ? 'true' : 'false');
    }
    if (resolvedTestsEditor) {
      resolvedTestsEditor.setAttribute('contenteditable', testsEditable ? 'true' : 'false');
    }
    if (testModeSelect) {
      testModeSelect.disabled = !testsEditable;
    }
    if (testDescription) {
      testDescription.disabled = !testsEditable;
    }
    if (useSelectionForTestsBtn) {
      useSelectionForTestsBtn.disabled = state.running || testsBusy;
    }
    if (replaceSelectionForTestsBtn) {
      replaceSelectionForTestsBtn.disabled = state.running || testsBusy;
    }
    clearSessionBtn.disabled = state.running;
    useSelectionForProblemBtn.disabled = !guidanceEditable;
    useSelectionForProblemBtn.classList.toggle('hidden', !guidanceEditable);
    generateTestsBtn.disabled = state.running || testsBusy || (hasSession && !interactiveSession) || (!hasSession && !hasProblemDraft);
    updateTestsIconState(generateTestsBtn, testsBusy && state.testOperation === 'generate', 'generateTests', 'generatingTestsStatus');
    saveResolvedTestsBtn.disabled = state.running || testsBusy || !interactiveSession || !hasResolvedTestsDraft;
    updateTestsIconState(saveResolvedTestsBtn, testsBusy && state.testOperation === 'save', 'saveTests', 'savingTestsStatus');
    renderPrimaryActionButton(hasResolvedTestsDraft);
    submitWorkflowBtn.classList.toggle(
      'hidden',
      hasSession && !interactiveSession && !state.running && !state.canResume && !taskPassed
    );
  }

  function resetTaskDraft() {
    state.localLogs = [];
    state.resolvedTestsDirty = false;
    state.editablePlanEventId = '';
    state.editablePlanText = '';
    state.editingPlanSource = false;
    state.codeDrafts = {};
    state.testDrafts = {};
    state.lastTimelineSignature = '';
    state.session = null;
    state.passedTaskConfirmedContinue = '';
    state.lastSessionId = '';
    state.problemDraftDirty = false;
    state.additionalInstructionPending = false;
    state.testDescriptionDirty = false;
    state.workflowProgressExpanded = false;
    state.testOperation = '';
    state.testOperationStatus = '';
    state.testOperationMessage = '';
    state.operationStatus = '';
    state.operationMessage = '';
    state.workflowError = '';
    state.lastPostedOperation = null;
    state.lastProblemSessionId = '';
    state.lastSyncedProblem = '';
    state.workflowMode = state.preferredWorkflowMode;
    executionModeSelect.value = state.preferredWorkflowMode;
    contextEnabledInput.checked = state.preferredContextEnabled;
    problemInput.value = '';
    if (testDescription) {
      testDescription.value = '';
    }
    setEditableCodeText(testInput, '');
    setEditableCodeText(resolvedTestsEditor, '');
    refreshEditableCodeBlocks();
    renderAll();
    problemInput.focus();
  }

  function renderAll() {
    updateTestInputPlaceholder();
    renderProfileOptions();
    renderResolvedTestsHint();
    renderComposerStatus();
    renderOperationFeedback();
    syncLayout();
    setTestsDrawerOpen(state.testsDrawerOpen);
    renderSetupSummaries();
    renderWorkflowModelSummary();
    renderProfileEditStatus();
		renderProfileNotice();
		renderEnvironmentStatus();
		renderPythonInterpreter();
		renderInlineCompletionSettings();
		switchSettingsTab(state.settingsTab);
    syncActionButtons();
    renderTimeline();
    renderLogsPage();
  }

  function currentRequestPayload() {
    const testMode = inferredTestMode();
    return {
      problem: state.session ? state.session.problem_statement : problemInput.value,
      additionalInstruction: state.session ? problemInput.value.trim() : '',
      testText: selectedTestText(),
      testMode,
      testDescription: testDescription ? testDescription.value.trim() : '',
      resolvedTestCode: testMode === 'generate' ? selectedResolvedTestCode() : undefined,
      contextEnabled: Boolean(contextEnabledInput.checked),
      maxRounds: 10,
      executionMode: executionModeSelect.value === 'continue' ? 'continue' : 'auto'
    };
  }

  function openProfileSettingsFromSetup() {
    if (!state.profileDirty && !state.profileSaving) {
      state.editingProfileId = taskProfileSelect.value || state.activeProfileId || (state.profiles[0] && state.profiles[0].id) || '';
      loadProfileEditor();
    } else {
      requireCleanProfile();
    }
    switchPage('settings');
		switchSettingsTab('profiles');
    renderAll();
  }

  openSettingsBtn.addEventListener('click', function () {
    switchPage('settings');
    switchSettingsTab('workflow');
    renderAll();
  });

  if (openTestsBtn) {
    openTestsBtn.addEventListener('click', function () {
      switchPage('task');
      setTestsDrawerOpen(!state.testsDrawerOpen, { focusEditor: !state.testsDrawerOpen });
    });
  }

  if (testsDrawerToggleBtn) {
    testsDrawerToggleBtn.addEventListener('click', function () {
      setTestsDrawerOpen(!state.testsDrawerOpen, { focusEditor: !state.testsDrawerOpen });
    });
  }

  if (closeTestsDrawerBtn) {
    closeTestsDrawerBtn.addEventListener('click', function () {
      setTestsDrawerOpen(false);
      if (problemInput) {
        problemInput.focus();
      }
    });
  }

  if (workflowProgressToggle) {
    workflowProgressToggle.addEventListener('click', function () {
      state.workflowProgressExpanded = !state.workflowProgressExpanded;
      renderWorkflowProgress();
      if (state.workflowProgressExpanded && workflowProgressPopover) {
        requestAnimationFrame(function () {
          workflowProgressPopover.scrollTop = workflowProgressPopover.scrollHeight;
        });
      }
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') {
      return;
    }
    if (state.workflowProgressExpanded) {
      event.preventDefault();
      state.workflowProgressExpanded = false;
      renderWorkflowProgress();
      if (workflowProgressToggle) {
        workflowProgressToggle.focus();
      }
      return;
    }
    if (!state.testsDrawerOpen) {
      return;
    }
    event.preventDefault();
    setTestsDrawerOpen(false);
    if (openTestsBtn) {
      openTestsBtn.focus();
    }
  });

  editProfileFromSetupBtn.addEventListener('click', function () {
    openProfileSettingsFromSetup();
  });

  if (profileNoticeBtn) {
    profileNoticeBtn.addEventListener('click', function () {
      openProfileSettingsFromSetup();
    });
  }

	if (checkEnvironmentBtn) {
		checkEnvironmentBtn.addEventListener('click', function () {
			vscode.postMessage({ type: 'checkEnvironment' });
		});
	}

	if (selectPythonInterpreterBtn) {
		selectPythonInterpreterBtn.addEventListener('click', function () {
			vscode.postMessage({ type: 'selectPythonInterpreter' });
		});
	}

	if (saveInlineCompletionBtn) {
		saveInlineCompletionBtn.addEventListener('click', function () {
			if (state.inlineSettingsSaving) return;
			const model = inlineCompletionModelInput?.value.trim() || '';
			const debounceValid = inlineCompletionDebounceInput?.checkValidity() !== false;
			const tokensValid = inlineCompletionMaxTokensInput?.checkValidity() !== false;
			if (!model) { inlineCompletionModelInput?.focus(); return; }
			if (!debounceValid || !tokensValid) {
				(!debounceValid ? inlineCompletionDebounceInput : inlineCompletionMaxTokensInput)?.reportValidity();
				return;
			}
			state.inlineSettingsSaving = true;
			renderInlineCompletionSettings();
			vscode.postMessage({
				type: 'saveInlineCompletionSettings',
				enabled: Boolean(inlineCompletionEnabledInput && inlineCompletionEnabledInput.checked),
				provider: inlineCompletionProviderSelect ? inlineCompletionProviderSelect.value : 'vllm',
				triggerMode: inlineCompletionTriggerModeSelect ? inlineCompletionTriggerModeSelect.value : 'automatic',
				baseUrl: inlineCompletionBaseUrlInput ? inlineCompletionBaseUrlInput.value : '',
				model: inlineCompletionModelInput ? inlineCompletionModelInput.value : '',
				debounceMs: inlineCompletionDebounceInput ? Number(inlineCompletionDebounceInput.value) : 700,
				maxTokens: inlineCompletionMaxTokensInput ? Number(inlineCompletionMaxTokensInput.value) : 192
			});
		});
	}


  if (backFromTestsBtn) {
    backFromTestsBtn.addEventListener('click', function () {
      switchPage('task');
      setTestsDrawerOpen(false);
    });
  }

  backToWorkflowBtn.addEventListener('click', function () {
    switchPage('task');
  });

  showOutputBtn.addEventListener('click', function () {
    switchPage('logs');
  });

  if (backFromLogsBtn) {
    backFromLogsBtn.addEventListener('click', function () {
      switchPage('task');
    });
  }

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', function () {
      vscode.postMessage({ type: 'requestLogHistory' });
    });
  }

  if (openRawOutputBtn) {
    openRawOutputBtn.addEventListener('click', function () {
      vscode.postMessage({ type: 'showOutput' });
    });
  }

  const languageToggleBtn = document.getElementById('languageToggleBtn');
  if (languageToggleBtn) {
    languageToggleBtn.addEventListener('click', function () {
      uiLanguage = uiLanguage === 'zh-CN' ? 'en' : 'zh-CN';
      persistSettingsPreferences();
      vscode.postMessage({ type: 'setUiLanguage', uiLanguage });
      applyTranslations();
      if (!state.profileDirty && !state.profileSaving) {
        loadProfileEditor();
      } else {
        updateProviderFieldHints();
        renderProfileEditStatus();
      }
      renderAll();
    });
  }

  taskProfileSelect.addEventListener('change', function () {
    const profileId = taskProfileSelect.value;
    state.activeProfileId = profileId;
    renderModelPicker();
    renderSetupSummaries();
    renderProfileNotice();
    syncActionButtons();
    vscode.postMessage({ type: 'switchProfile', profileId });
  });

  settingsProfileSelect.addEventListener('change', function () {
    if (!requireCleanProfile()) {
      settingsProfileSelect.value = state.editingProfileId || state.activeProfileId;
      return;
    }
    state.editingProfileId = settingsProfileSelect.value === NEW_PROFILE_DRAFT_ID
      ? NEW_PROFILE_DRAFT_ID : settingsProfileSelect.value;
    loadProfileEditor();
  });
  [profileNameInput, profileBaseUrlInput, profileModelInput,
    profileMaxTokensInput, profileApiKeyInput].forEach(function (element) {
    element.addEventListener('input', markProfileDirty);
  });
  profileProviderSelect.addEventListener('change', function () {
    markProfileDirty();
    updateProviderFieldHints();
  });
  if (discardProfileChangesBtn) discardProfileChangesBtn.addEventListener('click', loadProfileEditor);
  [inlineCompletionEnabledInput, inlineCompletionTriggerModeSelect,
    inlineCompletionProviderSelect].forEach(function (element) {
    if (!element) return;
    element.addEventListener('change', function () {
      state.inlineSettingsDirty = true;
      state.inlineSaveStatus = '';
      updateCompletionFieldsState();
      renderInlineCompletionSettings();
    });
  });
  [inlineCompletionBaseUrlInput, inlineCompletionModelInput,
    inlineCompletionDebounceInput, inlineCompletionMaxTokensInput].forEach(function (element) {
    if (!element) return;
    element.addEventListener('input', function () {
      state.inlineSettingsDirty = true;
      state.inlineSaveStatus = '';
      renderInlineCompletionSettings();
    });
  });
  settingsTabButtons.forEach(function (button, index) {
    button.addEventListener('click', function () { switchSettingsTab(button.dataset.settingsTab); });
    button.addEventListener('keydown', function (event) {
      let nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % settingsTabButtons.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index + settingsTabButtons.length - 1) % settingsTabButtons.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = settingsTabButtons.length - 1;
      else return;
      event.preventDefault();
      switchSettingsTab(settingsTabButtons[nextIndex].dataset.settingsTab, true);
    });
  });

  [[composerInteractiveModeBtn, 'continue'], [composerAutoModeBtn, 'auto']].forEach(function (item) {
    const button = item[0];
    if (!button) return;
    button.addEventListener('click', function () {
      if (state.running || state.session) return;
      if (executionModeSelect.value !== item[1]) {
        executionModeSelect.value = item[1];
        // The Settings selector is the single source of truth for persisted
        // preferences and the actual runWorkflow request.
        executionModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      problemInput.focus();
    });
  });

  executionModeSelect.addEventListener('change', function () {
    if (!state.session) {
      state.preferredWorkflowMode = executionModeSelect.value === 'auto' ? 'auto' : 'continue';
      state.workflowMode = state.preferredWorkflowMode;
      persistSettingsPreferences();
    }
    renderAll();
  });

  testModeSelect.addEventListener('change', function () {
    renderAll();
  });

  contextEnabledInput.addEventListener('change', function () {
    if (!state.session) {
      state.preferredContextEnabled = contextEnabledInput.checked;
      persistSettingsPreferences();
    }
    renderSetupSummaries();
  });

  function bindEditableCodeInput(element, onInput) {
    if (!element) {
      return;
    }
    element.addEventListener('focus', function () {
      prepareEditableCodeForInput(element);
    });
    element.addEventListener('blur', function () {
      highlightEditableCode(element);
      renderSetupSummaries();
    });
    element.addEventListener('input', onInput);
    bindPlainTextPaste(element);
  }

  bindEditableCodeInput(testInput, function () {
    state.resolvedTestsDirty = true;
    setEditableCodeText(resolvedTestsEditor, editableCodeText(testInput));
    renderSetupSummaries();
    syncActionButtons();
  });

  bindEditableCodeInput(resolvedTestsEditor, function () {
    state.resolvedTestsDirty = true;
    setEditableCodeText(testInput, editableCodeText(resolvedTestsEditor));
    refreshEditableCodeBlocks();
    renderResolvedTestsHint();
    renderSetupSummaries();
    syncActionButtons();
  });

  problemInput.addEventListener('input', function () {
    state.problemDraftDirty = true;
    syncActionButtons();
  });

  if (testDescription) {
    testDescription.addEventListener('input', function () {
      state.testDescriptionDirty = true;
    });
  }

  newProfileBtn.addEventListener('click', function () {
    startNewProfile(false);
  });

  openProfileConfigBtn.addEventListener('click', function () {
    vscode.postMessage({ type: 'openProfileConfig' });
  });

  reloadProfilesBtn.addEventListener('click', function () {
    if (requireCleanProfile()) vscode.postMessage({ type: 'reloadProfiles' });
  });

  saveProfileBtn.addEventListener('click', function () {
    if (state.profileSaving) return;
    const name = profileNameInput.value.trim();
    const model = profileModelInput.value.trim();
    const provider = profileProviderSelect.value;
    const url = profileBaseUrlInput.value.trim();
    const existing = findProfile(state.editingProfileId);
    const keyPresent = profileApiKeyInput.value.trim() || (existing && existing.apiKeyConfigured);
    function validationError(messageKey, element) {
      state.profileStatusOverride = messageKey;
      renderProfileEditStatus();
      if (element) element.focus();
    }
    if (!name || !model) {
      validationError('profileRequired', !name ? profileNameInput : profileModelInput);
      return;
    }
    if (['vllm', 'ollama', 'other'].includes(provider) && !url) {
      validationError('profileEndpointRequired', profileBaseUrlInput);
      return;
    }
    if (['openai', 'claude'].includes(provider) && !keyPresent) {
      validationError('profileKeyRequired', profileApiKeyInput);
      return;
    }
    if (!profileMaxTokensInput.value.trim() || !profileMaxTokensInput.checkValidity()) {
      profileMaxTokensInput.reportValidity();
      return;
    }
    state.profileSaving = true;
    state.profileStatusOverride = '';
    renderProfileEditStatus();
    const profileId = state.editingProfileId === NEW_PROFILE_DRAFT_ID ? '' : state.editingProfileId;
    vscode.postMessage({
      type: 'saveProfile',
      id: profileId,
      name: name,
      baseUrl: url,
      model: model,
      maxTokens: Number(profileMaxTokensInput.value),
      provider: provider,
      apiKey: profileApiKeyInput.value
    });
  });

  deleteProfileBtn.addEventListener('click', function () {
    if (!requireCleanProfile()) return;
    if (!state.editingProfileId || state.editingProfileId === NEW_PROFILE_DRAFT_ID) {
      addLocalLog('Profile', 'No saved profile selected for deletion.', 'failed');
      return;
    }
    vscode.postMessage({
      type: 'deleteProfile',
      id: state.editingProfileId
    });
  });

  useSelectionForProblemBtn.addEventListener('click', function () {
    state.pendingSelectionTarget = 'problem';
    state.pendingSelectionMode = 'append';
    vscode.postMessage({ type: 'useEditorSelection', target: 'problem', mode: 'append' });
  });

  useSelectionForTestsBtn.addEventListener('click', function () {
    state.pendingSelectionTarget = 'tests';
    state.pendingSelectionMode = 'append';
    vscode.postMessage({ type: 'useEditorSelection', target: 'tests', mode: 'append' });
  });

  if (replaceSelectionForTestsBtn) {
    replaceSelectionForTestsBtn.addEventListener('click', function () {
      state.pendingSelectionTarget = 'tests';
      state.pendingSelectionMode = 'replace';
      vscode.postMessage({ type: 'useEditorSelection', target: 'tests', mode: 'replace' });
    });
  }

  submitWorkflowBtn.addEventListener('click', function () {
    if (awaitingTaskConfirmation()) {
      renderTimeline();
      return;
    }
    if (state.running) {
      vscode.postMessage({ type: 'interruptWorkflow' });
      return;
    }
    if (state.canResume) {
      const resumePayload = Object.assign({ type: 'resumeWorkflow' }, currentActionPayload());
      state.additionalInstructionPending = Boolean(resumePayload.additionalInstruction);
      postTrackedOperation('workflow', resumePayload);
      return;
    }
    if (state.session) {
      const additionalInstruction = problemInput.value.trim();
      if (!additionalInstruction) {
        problemInput.focus();
        return;
      }
      state.additionalInstructionPending = true;
      postTrackedOperation('requirement', Object.assign({ type: 'addRequirement' }, currentActionPayload(), {
        additionalInstruction
      }));
      return;
    }
    state.localLogs = [];
    state.editablePlanEventId = '';
    state.editablePlanText = '';
    state.editingPlanSource = false;
    state.codeDrafts = {};
    state.testDrafts = {};
    postTrackedOperation('workflow', Object.assign({ type: 'runWorkflow' }, currentRequestPayload()));
  });

  clearSessionBtn.addEventListener('click', function () {
    resetTaskDraft();
    vscode.postMessage({ type: 'clearWorkflowSession' });
  });

  const testOptionsToggleBtn = document.getElementById('testOptionsToggleBtn');
  const testGenerationOptions = document.getElementById('testGenerationOptions');
  testOptionsToggleBtn.addEventListener('click', function () {
    testGenerationOptions.open = !testGenerationOptions.open;
    testOptionsToggleBtn.setAttribute('aria-expanded', String(testGenerationOptions.open));
    if (testGenerationOptions.open) testDescription.focus();
  });
  testGenerationOptions.addEventListener('toggle', function () {
    testOptionsToggleBtn.setAttribute('aria-expanded', String(testGenerationOptions.open));
  });

  generateTestsBtn.addEventListener('click', function () {
    postTrackedOperation('generate', Object.assign(currentActionPayload(), {
      type: 'runWorkflowAction',
      action: 'generate_tests',
      testText: '',
      testMode: 'generate',
      testDescription: testDescription ? testDescription.value.trim() : '',
      resolvedTestCode: '',
      useErrorFeedback: true
    }));
  });

  saveResolvedTestsBtn.addEventListener('click', function () {
    const savedTestCode = configuredTestCode();
    const savedTestDescription = testDescription ? testDescription.value.trim() : '';
    postTrackedOperation('save', {
      type: 'updateResolvedTests',
      resolvedTestCode: savedTestCode,
      testDescription: savedTestDescription
    });
  });

  problemInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !state.running) {
      event.preventDefault();
      submitWorkflowBtn.click();
    }
  });

  if (conversationScroll) {
    conversationScroll.addEventListener('scroll', function () {
      state.autoScrollPinned = isNearConversationBottom();
    });
  }

  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || typeof data.type !== 'string') {
      return;
    }

    switch (data.type) {
      case 'switchPage':
        switchPage(data.page === 'settings' || data.page === 'tests' || data.page === 'logs' ? data.page : 'task');
        break;
      case 'state': {
        const previousActiveProfileId = state.activeProfileId;
        const wasDraft = state.editingProfileId === NEW_PROFILE_DRAFT_ID;
        const currentEditingProfileId = state.editingProfileId;

        state.profiles = Array.isArray(data.profiles) ? data.profiles : [];
        if (Array.isArray(data.archivedSessions)) state.archivedSessions = data.archivedSessions;
        if (Array.isArray(data.restorableSessionIds)) state.restorableSessionIds = data.restorableSessionIds;
        state.activeProfileId = typeof data.activeProfileId === 'string' ? data.activeProfileId : '';
		state.environmentCheck = data.environmentCheck && typeof data.environmentCheck === 'object'
			? data.environmentCheck
			: state.environmentCheck;
		state.pythonPath = typeof data.pythonPath === 'string' ? data.pythonPath : state.pythonPath;
		state.inlineCompletion = data.inlineCompletion && typeof data.inlineCompletion === 'object'
			? data.inlineCompletion
			: state.inlineCompletion;
		state.studyTasks = Array.isArray(data.studyTasks) ? data.studyTasks : state.studyTasks;
        applyWorkflowSessionData(data);

        if (wasDraft && state.activeProfileId && state.activeProfileId !== previousActiveProfileId) {
          state.editingProfileId = state.activeProfileId;
        } else if (
          !currentEditingProfileId
          || (!findProfile(currentEditingProfileId) && currentEditingProfileId !== NEW_PROFILE_DRAFT_ID)
        ) {
          state.editingProfileId = state.activeProfileId || (state.profiles[0] && state.profiles[0].id) || NEW_PROFILE_DRAFT_ID;
        }

        if (!state.profileDirty && !state.profileSaving) loadProfileEditor();
        renderAll();
        break;
      }
      case 'profileSaveResult': {
        state.profileSaving = false;
        if (data.ok) {
          state.profileDirty = false;
          state.editingProfileId = data.profileId || state.activeProfileId;
          loadProfileEditor();
          state.profileStatusOverride = 'profileSavedStatus';
          if (state.returnToTaskAfterSave) {
            state.returnToTaskAfterSave = false;
            switchPage('task');
          }
        } else {
          state.profileDirty = true;
          state.profileStatusOverride = 'profileSaveError';
          if (typeof data.message === 'string') addLocalLog('Profile', data.message, 'failed');
        }
        renderProfileEditStatus();
        renderProfileOptions();
        renderWorkflowModelSummary();
        break;
      }
      case 'inlineSettingsSaveResult': {
        state.inlineSettingsSaving = false;
        state.inlineSettingsDirty = !data.ok;
        state.inlineSaveStatus = data.ok ? 'inlineSettingsSaved' : 'inlineSettingsFailed';
        if (!data.ok && typeof data.message === 'string') {
          addLocalLog('Inline completion', data.message, 'failed');
        }
        renderInlineCompletionSettings();
        break;
      }
      case 'workflowSession':
        applyWorkflowSessionData(data);
        renderAll();
        break;
      case 'logHistory':
        state.logEntries = Array.isArray(data.entries) ? data.entries : [];
        renderLogsPage();
        break;
      case 'prefillProblem':
        if (typeof data.problem === 'string') {
          const mode = data.mode || (state.pendingSelectionTarget === 'problem' ? state.pendingSelectionMode : '');
          problemInput.value = mode === 'append'
            ? appendText(problemInput.value, data.problem)
            : data.problem;
          state.problemDraftDirty = true;
          if (state.pendingSelectionTarget === 'problem') {
            setInlineStatus(operationState, mode === 'append' ? t('selectionAppended') : t('selectionReplaced'), 'passed');
          }
          state.pendingSelectionTarget = '';
          state.pendingSelectionMode = '';
          syncActionButtons();
        }
        break;
      case 'prefillTestText':
        if (typeof data.testText === 'string') {
          const mode = data.mode || (state.pendingSelectionTarget === 'tests' ? state.pendingSelectionMode : '');
          const nextTestText = mode === 'append'
            ? appendText(configuredTestCode(), data.testText)
            : data.testText;
          setEditableCodeText(testInput, nextTestText);
          setEditableCodeText(resolvedTestsEditor, nextTestText);
          state.resolvedTestsDirty = true;
          state.testOperation = 'selection';
          state.testOperationStatus = 'passed';
          state.testOperationMessage = mode === 'append' ? t('selectionAppended') : t('selectionReplaced');
          state.pendingSelectionTarget = '';
          state.pendingSelectionMode = '';
          if (data.reveal !== false) {
            setTestsDrawerOpen(true);
          }
          renderAll();
        }
        break;
      case 'runState':
        state.running = Boolean(data.running);
        state.runningLabel = typeof data.label === 'string' ? data.label : '';
        renderComposerStatus();
        renderOperationFeedback();
        syncActionButtons();
        renderTimeline();
        break;
      case 'operationState': {
        const action = typeof data.action === 'string' ? data.action : '';
        const scope = typeof data.scope === 'string' ? data.scope : 'workflow';
        state.running = Boolean(data.running);
        state.runningLabel = typeof data.label === 'string' ? data.label : '';
        if (state.running) {
          state.operationStatus = 'running';
          state.operationMessage = state.runningLabel || t('running');
          if (scope === 'tests' || action === 'generate_tests') {
            state.testOperation = 'generate';
            state.testOperationStatus = 'running';
            state.testOperationMessage = t('generatingTestsStatus');
          }
        } else if (state.operationStatus === 'running' && action !== 'guidance') {
          if (scope === 'tests' || action === 'generate_tests') {
            const generatedTests = state.session
              ? String(state.session.resolved_test_code || state.session.test_text || '').trim()
              : '';
            if (generatedTests) {
              state.testOperation = 'generate';
              state.testOperationStatus = 'passed';
              state.testOperationMessage = t('generatedTestsStatus');
              state.resolvedTestsDirty = true;
              state.operationStatus = 'passed';
              state.operationMessage = t('generatedTestsStatus');
              state.lastPostedOperation = null;
            }
          } else if (
            (action === 'auto' || action === 'auto_resume')
            && state.session
            && state.session.status === 'failed'
            && !state.session.passed
          ) {
            state.operationStatus = 'failed';
            state.operationMessage = t('runFailed');
            state.lastPostedOperation = null;
          } else {
            state.operationStatus = 'passed';
            state.operationMessage = t('workflowUpdatedStatus');
            state.lastPostedOperation = null;
          }
        }
        renderComposerStatus();
        renderOperationFeedback();
        syncActionButtons();
        renderTimeline();
        break;
      }
      case 'testsSaveResult': {
        const expectedRequestId = state.lastPostedOperation
          && state.lastPostedOperation.kind === 'save'
          && state.lastPostedOperation.message
          ? state.lastPostedOperation.message.requestId
          : '';
        if (data.requestId && expectedRequestId && data.requestId !== expectedRequestId) {
          break;
        }
        const ok = Boolean(data.ok);
        const message = typeof data.message === 'string' && data.message
          ? data.message
          : ok ? t('savedTestsStatus') : t('operationFailed');
        state.testOperation = 'save';
        state.testOperationStatus = ok ? 'passed' : 'failed';
        state.testOperationMessage = ok ? t('savedTestsStatus') : message;
        state.operationStatus = ok ? 'passed' : 'failed';
        state.operationMessage = ok ? t('savedTestsStatus') : message;
        if (ok) {
          state.resolvedTestsDirty = false;
          state.testDescriptionDirty = false;
          state.workflowError = '';
          state.lastPostedOperation = null;
        } else {
          state.workflowError = message;
        }
        renderOperationFeedback();
        syncActionButtons();
        break;
      }
      case 'selectionResult': {
        if (!data.ok) {
          const message = typeof data.message === 'string' ? data.message : t('operationFailed');
          state.pendingSelectionTarget = '';
          state.pendingSelectionMode = '';
          if (data.target === 'tests') {
            state.testOperation = 'selection';
            state.testOperationStatus = 'failed';
            state.testOperationMessage = message;
            setTestsDrawerOpen(true);
          } else {
            state.operationStatus = 'failed';
            state.operationMessage = message;
          }
          renderOperationFeedback();
        }
        break;
      }
      case 'guidanceResult': {
        const ok = Boolean(data.ok);
        const message = typeof data.message === 'string' && data.message
          ? data.message
          : ok ? t('instructionAddedStatus') : t('operationFailed');
        state.additionalInstructionPending = false;
        state.operationStatus = ok ? 'passed' : 'failed';
        state.operationMessage = ok ? t('instructionAddedStatus') : message;
        if (ok) {
          problemInput.value = '';
          state.problemDraftDirty = false;
          state.workflowError = '';
          state.lastPostedOperation = null;
        } else {
          state.workflowError = message;
        }
        renderOperationFeedback();
        syncActionButtons();
        break;
      }
      case 'log':
        if (typeof data.text === 'string') {
          if (state.pendingSelectionTarget) {
            setInlineStatus(operationState, data.text, data.level === 'error' ? 'failed' : 'ready');
            state.pendingSelectionTarget = '';
            state.pendingSelectionMode = '';
          }
          addLocalLog('Log', data.text, typeof data.level === 'string' ? data.level : 'ready');
        }
        break;
      case 'workflowError':
        state.workflowError = typeof data.reason === 'string' ? data.reason : 'Unknown workflow error.';
        state.operationStatus = 'failed';
        state.operationMessage = t('operationFailed') + ': ' + state.workflowError;
        if (state.testOperationStatus === 'running') {
          state.testOperationStatus = 'failed';
          state.testOperationMessage = t('operationFailed') + ': ' + state.workflowError;
        }
        state.additionalInstructionPending = false;
        switchPage('task');
        addLocalLog('Workflow Error', state.workflowError, 'failed');
        renderComposerStatus();
        renderOperationFeedback();
        syncActionButtons();
        break;
      default:
        break;
    }
  });

  applyTranslations();
  switchPage('task');
	switchSettingsTab('workflow');
  renderAll();
  vscode.postMessage({ type: 'ready', uiLanguage });
})();
