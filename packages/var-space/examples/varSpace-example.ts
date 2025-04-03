// Assuming VarSpace is exported from the main index of the package
import { VarSpace, IVarStruct } from '../src/index'; // Adjusted path relative to examples dir
import { autorun, toJS, IReactionDisposer } from 'mobx'; // Import MobX autorun and Disposer type

// Get UI Elements
const treeViewContainer = document.getElementById('tree-view') as HTMLElement | null;
const observableToggle = document.getElementById('observable-toggle') as HTMLInputElement | null;

// State for MobX reaction disposer
let currentAutorunDisposer: IReactionDisposer | null = null;

// Helper to log messages (can be kept for console debugging)
function log(message: string, data?: any) {
  console.log(message, data !== undefined ? toJS(data) : '');
}

if (!treeViewContainer || !observableToggle) {
  console.error("Could not find required UI elements (tree-view or observable-toggle)");
  // Optionally disable the toggle or halt execution
}

// --- Main Setup Function --- //

function createAndRenderVarSpace(isObservable: boolean) {
    log(`--- Creating VarSpace (Observable: ${isObservable}) ---`);

    // Cleanup previous autorun if it exists
    if (currentAutorunDisposer) {
        log("Disposing previous autorun reaction.");
        currentAutorunDisposer();
        currentAutorunDisposer = null;
    }

    if (treeViewContainer) {
        treeViewContainer.innerHTML = 'Recreating...'; // Indicate change
    }

    // 1. Create a VarSpace instance with the desired observable setting
    const myVarSpace = (window as any).$myVarSpace = new VarSpace({
        key: '$appData',
        label: 'Application Data',
        observable: isObservable // Use the parameter here
    });
    log("VarSpace instance created:", { key: myVarSpace.key, label: myVarSpace.$label, observable: myVarSpace.varDescriptor.observable });

    // 2. Define the structure using $appendLeaf and $appendNest
    log('Defining structure...');
    myVarSpace.$appendLeaf('pageTitle', { nativeType: 'String', label: 'Page Title', value: 'Default Title' });
    myVarSpace.$appendLeaf('counter', { nativeType: 'Number', label: '点击次数', value: 0 });
    myVarSpace.$appendLeaf('lastUpdate', { nativeType: 'DateTime', label: '最后更新时间' }); // No initial value
    myVarSpace.$appendLeaf('readOnlyInfo', { nativeType: 'String', label: 'Read Only Info', value: 'Cannot change me', writable: false });

    // Add a nested object for user settings
    const [userSettingsNode] = myVarSpace.$appendNest('userSettings', { label: 'User Settings', nativeType: 'Object' });
    userSettingsNode.$appendLeaf('theme', { nativeType: 'String', label: 'UI Theme', value: 'light' });
    userSettingsNode.$appendLeaf('notificationsEnabled', { nativeType: 'Boolean', label: 'Enable Notifications', value: true });

    log("Structure defined. Initial Struct:", myVarSpace.getStruct());
    log("Initial data (before $setData):", myVarSpace.getData());

    // 3. Set initial data (data persists across recreations in this simple example)
    log('Setting data with $setData...');
    myVarSpace.$setData({
        pageTitle: 'VarSpace Demo Page',
        userSettings: {
            theme: 'dark'
        },
        apiEndpoint: '/api/v1/data'
    });
    log("Data after $setData:", myVarSpace.getData());

    // 4. Build the final $data object - This makes it observable by MobX
    log('Building reactive $data...');
    myVarSpace.build$data();
    log("Final reactive $data object built:", myVarSpace.$data);

    // --- Tree Rendering Logic ---

    function renderVarSpaceTree(vs: VarSpace, container: HTMLElement) {
        log("Rendering tree...");
        const rootStruct = vs.getVsStruct(); // Get structure
        const data = vs.$data; // Get the reactive data

        container.innerHTML = ''; // Clear previous tree
        const rootUl = document.createElement('ul');
        rootUl.style.listStyleType = 'none';
        rootUl.style.paddingLeft = '0';

        // Recursive function to build the tree nodes
        function buildNode(itemStruct: IVarStruct, currentData: any, parentPath: string = '') {
            const li = document.createElement('li');
            li.style.marginLeft = '20px';
            const nodePath = parentPath ? `${parentPath}.${itemStruct.key}` : itemStruct.key;

            let content = `<strong>${itemStruct.label || itemStruct.key}</strong> (${itemStruct.type})`;

            if (itemStruct.children && itemStruct.children.length > 0) {
                // Object Node
                const childUl = document.createElement('ul');
                childUl.style.listStyleType = 'none';
                childUl.style.paddingLeft = '0';
                itemStruct.children.forEach(child => {
                    const childNode = buildNode(child, currentData?.[itemStruct.key], nodePath);
                    childUl.appendChild(childNode);
                });
                li.innerHTML = content;
                li.appendChild(childUl);
            } else {
                // Leaf Node
                const value = currentData?.[itemStruct.key];
                content += `: ${JSON.stringify(value)}`; // Display current value (using stringify for clarity)

                if (itemStruct.writable) {
                    const input = document.createElement('input');
                    input.type = (itemStruct.type === 'Number') ? 'number' :
                                (itemStruct.type === 'Boolean') ? 'checkbox' :
                                'text';

                    input.style.marginLeft = '10px';
                    input.setAttribute('data-path', nodePath);

                    if (input.type === 'checkbox') {
                        input.checked = !!value;
                    } else {
                        input.value = value ?? '';
                    }

                    input.addEventListener('change', (event) => {
                        const targetInput = event.target as HTMLInputElement;
                        const path = targetInput.getAttribute('data-path');
                        let newValue: any = targetInput.type === 'checkbox' ? targetInput.checked : targetInput.value;

                        if (targetInput.type === 'number') {
                            newValue = Number(newValue);
                        }

                        if (path) {
                            log(`Updating path ${path} to:`, newValue);
                            try {
                                // Use helper function for safer nested assignment
                                setNestedValue(vs, path, newValue);

                                targetInput.style.backgroundColor = 'lightgreen';
                                setTimeout(() => { targetInput.style.backgroundColor = ''; }, 500);
                            } catch (error: any) {
                                console.error(`Error setting value for path ${path}:`, error);
                                targetInput.style.backgroundColor = 'salmon';
                            }
                        }
                    });
                    content += ' '; // Add space
                    li.innerHTML = content;
                    li.appendChild(input);
                } else {
                    li.innerHTML = content + ' (read-only)';
                }
            }
            return li;
        }

        // Build the tree starting from the root structure children
        if (rootStruct.children) {
            rootStruct.children.forEach(childStruct => {
                const node = buildNode(childStruct, data);
                rootUl.appendChild(node);
            });
        }

        container.appendChild(rootUl);
    }

    // --- MobX Autorun Setup --- //
    if (treeViewContainer) {
        // Setup the autorun and store its disposer
        currentAutorunDisposer = autorun(() => {
            renderVarSpaceTree(myVarSpace, treeViewContainer);
        });
    } else {
        log("Tree view container not found, MobX autorun not started.");
    }

    log(`--- VarSpace Creation Complete (Observable: ${isObservable}) ---`);
}

// --- Helper function for safely setting nested values via proxy --- //
function setNestedValue(obj: any, path: string, value: any) {
    const pathSegments = path.split('.');
    let current = obj;
    for (let i = 0; i < pathSegments.length - 1; i++) {
        current = current[pathSegments[i]];
        if (typeof current !== 'object' || current === null) {
            throw new Error(`Invalid path segment: ${pathSegments[i]} is not an object.`);
        }
    }
    current[pathSegments[pathSegments.length - 1]] = value;
}

// --- Initial Setup & Event Listener --- //

if (observableToggle) {
    // Initial call based on checkbox default state
    createAndRenderVarSpace(observableToggle.checked);

    // Add event listener to checkbox
    observableToggle.addEventListener('change', (event) => {
        const isChecked = (event.target as HTMLInputElement).checked;
        createAndRenderVarSpace(isChecked);
    });
} else {
    // Fallback or error if checkbox isn't found
    log("Observable toggle checkbox not found. Cannot set up listener.");
    // Optionally run with a default setting:
    // createAndRenderVarSpace(true); // Default to observable if checkbox missing
}

log('--- VarSpace Example Initialization End ---'); 