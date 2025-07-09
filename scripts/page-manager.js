#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get command line arguments
const [action, sourcePage, newPage] = process.argv.slice(2);

if (!['duplicate', 'remove'].includes(action)) {
  console.error('Usage: node scripts/page-manager.js <action> <sourcePage> [newPage]');
  console.error('Actions:');
  console.error('  duplicate <sourcePage> <newPage> - Duplicate a page and its components');
  console.error('  remove <pageName> - Remove a page and its components');
  process.exit(1);
}

const rootDir = path.join(__dirname, '..');

// Function to replace all occurrences in a string
function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

// Function to convert to simple lowercase
function toSimpleLower(str) {
  return str.replace(/Page$/i, '').toLowerCase();
}

// Function to process file content
function processFileContent(content, sourceName, newName) {
  // Replace component names
  let newContent = replaceAll(content, sourceName, newName);
  
  // Replace simple lowercase names in imports and paths
  const sourceLower = sourceName.replace('Page', '').toLowerCase();
  const newLower = newName.replace('Page', '').toLowerCase();
  newContent = replaceAll(newContent, sourceLower, newLower);
  
  // Replace camelCase names
  const sourceCamel = sourceName[0].toLowerCase() + sourceName.slice(1);
  const newCamel = newName[0].toLowerCase() + newName.slice(1);
  newContent = replaceAll(newContent, sourceCamel, newCamel);
  
  return newContent;
}

// Function to update the valid page IDs in the route handler
function updateValidPageIds(pageId, action = 'add') {
  const routeFilePath = path.join(rootDir, 'src', 'app', 'pages', '[pageId]', 'page.tsx');
  try {
    let content = fs.readFileSync(routeFilePath, 'utf8');
    
    // Find and update the validPageIds array
    const regex = /const validPageIds = \[([\s\S]*?)\] as const;/;
    const match = content.match(regex);
    
    if (match) {
      let currentIds = match[1].split(',').map(id => id.trim().replace(/'/g, '').trim()).filter(Boolean);
      
      if (action === 'add') {
        // Add new page ID
        if (!currentIds.includes(pageId)) {
          currentIds.push(`'${pageId}'`);
          const newValidPageIds = `const validPageIds = [${currentIds.join(', ')}] as const;`;
          content = content.replace(regex, newValidPageIds);
          
          // Ensure the page component is async
          if (!content.includes('export default async function Page')) {
            content = content.replace('export default function Page', 'export default async function Page');
          }
          
          fs.writeFileSync(routeFilePath, content, 'utf8');
          console.log(`✅ Updated valid page IDs with: ${pageId}`);
        }
      } else if (action === 'remove') {
        // Remove page ID
        const updatedIds = currentIds.filter(id => id !== `'${pageId}'`);
        if (updatedIds.length < currentIds.length) {
          const newValidPageIds = `const validPageIds = [${updatedIds.join(', ')}] as const;`;
          fs.writeFileSync(routeFilePath, content.replace(regex, newValidPageIds), 'utf8');
          console.log(`✅ Removed page ID: ${pageId}`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not update route configuration.');
    if (action === 'add') {
      console.warn(`Add '${pageId}' to the validPageIds array in src/app/pages/[pageId]/page.tsx`);
    } else {
      console.warn(`Remove '${pageId}' from the validPageIds array in src/app/pages/[pageId]/page.tsx`);
    }
  }
}

// Function to update DynamicPageLoader.tsx
function updateDynamicPageLoader(pageName, action = 'add') {
  const loaderPath = path.join(rootDir, 'src', 'components', 'pages', 'DynamicPageLoader.tsx');
  try {
    let content = fs.readFileSync(loaderPath, 'utf8');
    const pageKebab = toKebabCase(pageName.replace('Page', ''));
    
    if (action === 'add') {
      // Add new page component
      if (!content.includes(`'${pageKebab}':`)) {
        const lastComponentRegex = /([\s\S]*?)(\},[\s\r\n]+)\] as const;/;
        const match = content.match(lastComponentRegex);
        
        if (match) {
          const newComponent = `  ${pageKebab}: dynamic(() => import('./${pageName}'), { ssr: false }),\n`;
          const newContent = content.replace(lastComponentRegex, `$1$2${newComponent}] as const;`);
          fs.writeFileSync(loaderPath, newContent, 'utf8');
          console.log(`✅ Added ${pageName} to DynamicPageLoader`);
        }
      }
    } else if (action === 'remove') {
      // Remove page component
      const componentRegex = new RegExp(`\s*'${pageKebab}': dynamic\(\s*\(\)\s*=>\s*import\('\.\/${pageName}'\)\s*,\s*\{\s*ssr:\s*false\s*\},\s*\}[,]?[\s\r\n]*`, 'g');
      if (componentRegex.test(content)) {
        const newContent = content.replace(componentRegex, '');
        fs.writeFileSync(loaderPath, newContent, 'utf8');
        console.log(`✅ Removed ${pageName} from DynamicPageLoader`);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not update DynamicPageLoader for ${pageName}`);
  }
}

// Function to copy directory recursively
function copyDirectory(source, target, sourceName, newName) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file.replace(new RegExp(sourceName, 'gi'), newName));
    
    if (fs.lstatSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath, sourceName, newName);
    } else {
      const content = fs.readFileSync(sourcePath, 'utf8');
      const newContent = processFileContent(content, sourceName, newName);
      fs.writeFileSync(targetPath, newContent, 'utf8');
    }
  }
}

// Function to remove directory recursively
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        removeDirectory(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
    console.log(`✅ Removed directory: ${dirPath}`);
  }
}

// Function to duplicate a page
function duplicatePage(sourcePage, newPage) {
  try {
    // Ensure sourcePage has 'Page' suffix and newPage doesn't
    const sourcePageName = sourcePage.endsWith('Page') ? sourcePage : `${sourcePage}Page`;
    let newPageName = newPage.endsWith('Page') ? newPage : `${newPage}Page`;
    
    console.log(`Duplicating ${sourcePageName} to ${newPageName}...`);
    
    const sourcePagePath = path.join(rootDir, 'src', 'components', 'pages', `${sourcePageName}.tsx`);
    const newPagePath = path.join(rootDir, 'src', 'components', 'pages', `${newPageName}.tsx`);
    const sourceSectionPath = path.join(rootDir, 'src', 'components', 'sections', sourcePageName.replace('Page', '').toLowerCase());
    const newSectionPath = path.join(rootDir, 'src', 'components', 'sections', newPageName.replace('Page', '').toLowerCase());
    
    // 1. Duplicate the page component
    if (!fs.existsSync(sourcePagePath)) {
      throw new Error(`Source page not found: ${sourcePagePath}`);
    }
    
    // Read and process the source file
    const content = fs.readFileSync(sourcePagePath, 'utf8');
    const newContent = processFileContent(content, sourcePageName, newPageName);
    
    // Ensure the destination directory exists
    fs.mkdirSync(path.dirname(newPagePath), { recursive: true });
    
    // Write the new page file
    fs.writeFileSync(newPagePath, newContent);
    console.log(`✅ Created ${path.basename(newPagePath)}`);
    
    // 2. Duplicate the section directory
    if (fs.existsSync(sourceSectionPath)) {
      // Create the new section directory
      fs.mkdirSync(newSectionPath, { recursive: true });
      
      // Copy all files from source to destination
      const files = fs.readdirSync(sourceSectionPath);
      for (const file of files) {
        const sourceFile = path.join(sourceSectionPath, file);
        const destFile = path.join(newSectionPath, file);
        
        // Process file content if it's a .tsx or .ts file
        if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(sourceFile, 'utf8');
          const newContent = processFileContent(content, sourcePageName, newPageName);
          fs.writeFileSync(destFile, newContent);
        } else {
          // Copy other files as-is
          fs.copyFileSync(sourceFile, destFile);
        }
      }
      
      console.log(`✅ Created section directory: ${path.basename(newSectionPath)}`);
    }
    
    // 3. Update the valid page IDs in the route handler
    const pageId = newPage.replace('Page', '').toLowerCase();
    updateValidPageIds(pageId, 'add');
    
    // 4. Update DynamicPageLoader.tsx
    updateDynamicPageLoader(newPage, 'add');
    
    console.log('\n🎉 Page duplication complete!');
    console.log(`\nNext steps:`);
    console.log(`1. Run 'npm run build' to generate the new static page`);
    console.log(`2. Update any page-specific configurations in ${newPagePath}`);
    console.log(`3. Update any hardcoded values in the new components`);
    
  } catch (error) {
    console.error('Error duplicating page:', error);
    process.exit(1);
  }
}

// Function to remove a page
function removePage(pageName) {
  try {
    // Ensure pageName has 'Page' suffix if missing
    const fullPageName = pageName.endsWith('Page') ? pageName : `${pageName}Page`;
    console.log(`Removing ${fullPageName}...`);
    
    // Remove page component
    const pagePath = path.join(rootDir, 'src', 'components', 'pages', `${fullPageName}.tsx`);
    if (fs.existsSync(pagePath)) {
      fs.unlinkSync(pagePath);
      console.log(`✅ Removed ${fullPageName}.tsx`);
    } else {
      console.log(`ℹ️  Page component not found: ${pagePath}`);
    }
    
    // Remove section directory
    const sectionPath = path.join(rootDir, 'src', 'components', 'sections', fullPageName.replace('Page', '').toLowerCase());
    if (fs.existsSync(sectionPath)) {
      removeDirectory(sectionPath);
    } else {
      console.log(`ℹ️  Section directory not found: ${sectionPath}`);
    }
    
    // Update the valid page IDs in the route handler
    const pageId = fullPageName.replace('Page', '').toLowerCase();
    updateValidPageIds(pageId, 'remove');
    
    // Update DynamicPageLoader.tsx
    updateDynamicPageLoader(fullPageName, 'remove');
    
    // Remove from build cache
    const nextCache = path.join(rootDir, '.next');
    if (fs.existsSync(nextCache)) {
      console.log('⚠️  Please run "npm run build" to update the build cache');
    }
    
    console.log('\n🎉 Page removal complete!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run build" to update the static pages');
    
  } catch (error) {
    console.error('Error removing page:', error);
    process.exit(1);
  }
}

// Execute the appropriate action
if (action === 'duplicate') {
  if (!newPage) {
    console.error('Error: New page name is required for duplication');
    process.exit(1);
  }
  duplicatePage(sourcePage, newPage);
} else if (action === 'remove') {
  removePage(sourcePage);
}
