'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Modal from './Modal';

interface Tag {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  userCount?: number;
  projectCount?: number;
  totalUsage?: number;
}

interface EntityTag {
  id: string;
  tagId: string;
  createdAt: string;
  tag: Tag;
}

interface TagManagementProps {
  entityType: 'user' | 'project';
  entityId: string;
  entityName?: string | null;
  currentTags?: EntityTag[];
  onTagsUpdated?: () => void;
  showTitle?: boolean;
  compact?: boolean;
}

export default function TagManagement({
  entityType,
  entityId,
  entityName,
  currentTags = [],
  onTagsUpdated,
  showTitle = true,
  compact = false
}: TagManagementProps) {
  // Tag management state
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagColor, setNewTagColor] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isRemovingTag, setIsRemovingTag] = useState<string | null>(null);
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false);
  const [existingTagMatch, setExistingTagMatch] = useState<Tag | null>(null);
  const [tagAction, setTagAction] = useState<'create' | 'use' | 'update'>('create');

  // Fetch available tags
  useEffect(() => {
    async function fetchTags() {
      try {
        setIsLoadingTags(true);
        const response = await fetch('/api/admin/tags');
        
        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }
        
        const tags = await response.json();
        setAvailableTags(tags);
      } catch (err) {
        console.error('Error fetching tags:', err);
        toast.error('Failed to load available tags');
      } finally {
        setIsLoadingTags(false);
      }
    }
    
    fetchTags();
  }, []);

  // Check for existing tag matches when name changes
  useEffect(() => {
    if (!newTagName.trim()) {
      setExistingTagMatch(null);
      setTagAction('create');
      return;
    }

    const matchingTag = availableTags.find(
      tag => tag.name.toLowerCase() === newTagName.trim()
    );

    if (matchingTag) {
      // Only update if we don't already have this tag as a match
      // (to avoid resetting user's action choice)
      if (!existingTagMatch || existingTagMatch.id !== matchingTag.id) {
        setExistingTagMatch(matchingTag);
        // Auto-fill description and color from existing tag (only if fields are empty)
        if (!newTagDescription && matchingTag.description) {
          setNewTagDescription(matchingTag.description);
        }
        if (!newTagColor && matchingTag.color) {
          setNewTagColor(matchingTag.color);
        }
        // Only set to 'use' when first detecting the match
        setTagAction('use');
      }
    } else {
      setExistingTagMatch(null);
      setTagAction('create');
    }
  }, [newTagName, availableTags]);

  const addTagToEntity = async () => {
    if (!newTagName.trim()) return;

    try {
      setIsAddingTag(true);
      
      // Check if entity already has this tag
      const entityAlreadyHasTag = currentTags.some(
        entityTag => entityTag.tag.name.toLowerCase() === newTagName.trim()
      );
      
      // If we're updating an existing tag, handle it differently
      if (tagAction === 'update' && existingTagMatch) {
        const hasChanges = 
          (newTagDescription !== (existingTagMatch.description || '')) ||
          (newTagColor !== (existingTagMatch.color || ''));
          
        if (hasChanges) {
          const updateResponse = await fetch('/api/admin/tags/update', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tagId: existingTagMatch.id,
              description: newTagDescription.trim() || undefined,
              color: newTagColor.trim() || undefined,
            }),
          });

          if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(errorData.error || 'Failed to update tag');
          }
        }
        
        // If entity already has this tag, we're done - just updated the tag details
        if (entityAlreadyHasTag) {
          // Refresh available tags
          const tagsResponse = await fetch('/api/admin/tags');
          if (tagsResponse.ok) {
            const tags = await tagsResponse.json();
            setAvailableTags(tags);
          }
          
          // Clear form and close modal
          handleCloseAddTagModal();
          
          if (onTagsUpdated) onTagsUpdated();
          toast.success(`Tag "${existingTagMatch.name}" updated successfully`);
          return;
        }
      }
      
      // If using existing tag and entity already has it, show error
      if (tagAction === 'use' && entityAlreadyHasTag) {
        throw new Error(`${entityType === 'user' ? 'User' : 'Project'} already has the tag "${newTagName}"`);
      }
      
      // Otherwise, proceed with adding the tag
      const response = await fetch('/api/admin/tags/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          tagName: newTagName.trim(),
          tagDescription: newTagDescription.trim() || undefined,
          tagColor: newTagColor.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add tag');
      }

      const result = await response.json();
      
      // Refresh available tags
      const tagsResponse = await fetch('/api/admin/tags');
      if (tagsResponse.ok) {
        const tags = await tagsResponse.json();
        setAvailableTags(tags);
      }
      
      // Clear form and close modal
      handleCloseAddTagModal();
      
      if (onTagsUpdated) onTagsUpdated();
      
      const actionText = tagAction === 'update' ? 'updated and added' : 'added';
      toast.success(`Tag "${result.data.tag.name}" ${actionText} successfully`);
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add tag');
    } finally {
      setIsAddingTag(false);
    }
  };

  const removeTagFromEntity = async (entityTagId: string, tagName: string) => {
    try {
      setIsRemovingTag(entityTagId);
      
      const response = await fetch('/api/admin/tags/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          associationId: entityTagId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove tag');
      }
      
      // Refresh available tags to update usage counts
      const tagsResponse = await fetch('/api/admin/tags');
      if (tagsResponse.ok) {
        const tags = await tagsResponse.json();
        setAvailableTags(tags);
      }
      
      if (onTagsUpdated) onTagsUpdated();
      toast.success(`Tag "${tagName}" removed successfully`);
      
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove tag');
    } finally {
      setIsRemovingTag(null);
    }
  };

  const handleCloseAddTagModal = () => {
    setIsAddTagModalOpen(false);
    // Clear form when closing modal
    setNewTagName('');
    setNewTagDescription('');
    setNewTagColor('');
    setExistingTagMatch(null);
    setTagAction('create');
  };

  const entityDisplayName = entityType === 'user' ? 'User' : 'Project';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Header */}
      {showTitle && (
        <div className="flex justify-between items-center">
          <h3 className={`font-medium text-gray-700 ${compact ? 'text-sm' : 'text-lg'}`}>
            Tags
          </h3>
          <button
            type="button"
            onClick={() => setIsAddTagModalOpen(true)}
            className={`bg-green-600 hover:bg-green-700 text-white rounded transition-colors focus:outline-none flex items-center gap-2 ${
              compact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Tag
          </button>
        </div>
      )}

      {/* Current Tags */}
      <div>
        {!showTitle && (
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-700">Current Tags</h4>
            <button
              type="button"
              onClick={() => setIsAddTagModalOpen(true)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors focus:outline-none flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          </div>
        )}
        
        {currentTags && currentTags.length > 0 ? (
          <div className={`flex flex-wrap gap-2 ${compact ? 'mb-2' : 'mb-4'}`}>
            {currentTags.map((entityTag) => (
              <div
                key={entityTag.id}
                className={`inline-flex items-center gap-2 rounded-full border ${
                  compact ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'
                }`}
                style={{
                  backgroundColor: entityTag.tag.color ? `${entityTag.tag.color}20` : '#f3f4f6',
                  borderColor: entityTag.tag.color || '#d1d5db',
                  color: entityTag.tag.color || '#374151'
                }}
                title={entityTag.tag.description || undefined}
              >
                <span>{entityTag.tag.name}</span>
                <button
                  onClick={() => removeTagFromEntity(entityTag.id, entityTag.tag.name)}
                  disabled={isRemovingTag === entityTag.id}
                  className="ml-1 text-red-500 hover:text-red-700 disabled:opacity-50"
                  title="Remove tag"
                >
                  {isRemovingTag === entityTag.id ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-t border-red-500"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-gray-500 ${compact ? 'text-xs mb-2' : 'text-sm mb-4'}`}>
            No tags assigned to this {entityType}.
          </p>
        )}
      </div>

      {/* Add Tag Modal */}
      <Modal
        isOpen={isAddTagModalOpen}
        onClose={handleCloseAddTagModal}
        title={`Add Tag to ${entityDisplayName}${entityName ? ` (${entityName})` : ''}`}
        hideFooter={true}
      >
        <div className="space-y-6">
          {/* Quick Add from Existing Tags */}
          {availableTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quick Add from Existing Tags
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags
                  .filter(tag => !currentTags.some(entityTag => entityTag.tag.id === tag.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setNewTagName(tag.name.toLowerCase());
                        setNewTagDescription(tag.description || '');
                        setNewTagColor(tag.color || '');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50 transition-colors"
                      style={{
                        backgroundColor: tag.color ? `${tag.color}20` : '#f9fafb',
                        borderColor: tag.color || '#d1d5db'
                      }}
                      title={tag.description || undefined}
                    >
                      <span>{tag.name}</span>
                      <span className="text-gray-500 text-xs">({tag.totalUsage || 0})</span>
                    </button>
                  ))}
              </div>
              {availableTags.filter(tag => !currentTags.some(entityTag => entityTag.tag.id === tag.id)).length === 0 && (
                <p className="text-gray-500 text-sm">All available tags are already assigned to this {entityType}.</p>
              )}
            </div>
          )}

          {/* Manual Tag Creation */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Create New Tag
            </label>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="modalNewTagName" className="block text-sm font-medium text-gray-600 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  id="modalNewTagName"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value.toLowerCase())}
                  placeholder="Enter tag name (will be lowercase)"
                  className={`w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 ${
                    existingTagMatch 
                      ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500' 
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                
                {/* Existing Tag Warning */}
                {existingTagMatch && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-yellow-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          A tag with this name already exists
                        </p>
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-yellow-700">Current tag:</span>
                            <div 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border"
                              style={{
                                backgroundColor: existingTagMatch.color ? `${existingTagMatch.color}20` : '#f9fafb',
                                borderColor: existingTagMatch.color || '#d1d5db',
                                color: existingTagMatch.color || '#374151'
                              }}
                              title={existingTagMatch.description || undefined}
                            >
                              <span>{existingTagMatch.name}</span>
                            </div>
                            <span className="text-xs text-gray-500">Used {existingTagMatch.totalUsage || 0} times</span>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="tagAction"
                                value="use"
                                checked={tagAction === 'use'}
                                onChange={(e) => setTagAction(e.target.value as 'create' | 'use' | 'update')}
                                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-yellow-700">Use existing tag as-is</span>
                            </label>
                            
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name="tagAction"
                                value="update"
                                checked={tagAction === 'update'}
                                onChange={(e) => setTagAction(e.target.value as 'create' | 'use' | 'update')}
                                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300"
                              />
                              <span className="ml-2 text-sm text-yellow-700">
                                Update existing tag
                                {(newTagDescription !== (existingTagMatch.description || '') || 
                                  newTagColor !== (existingTagMatch.color || '')) && (
                                  <span className="text-yellow-600"> (with new details)</span>
                                )}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Only show description and color fields if no existing tag match OR if user chose to update */}
              {(!existingTagMatch || tagAction === 'update') && (
                <>
                  <div>
                    <label htmlFor="modalNewTagDescription" className="block text-sm font-medium text-gray-600 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      id="modalNewTagDescription"
                      value={newTagDescription}
                      onChange={(e) => setNewTagDescription(e.target.value)}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="modalNewTagColor" className="block text-sm font-medium text-gray-600 mb-1">
                      Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        id="modalNewTagColor"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseAddTagModal}
              disabled={isAddingTag}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addTagToEntity}
              disabled={isAddingTag || !newTagName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 flex items-center gap-2"
            >
              {isAddingTag ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                  {tagAction === 'update' ? 'Updating & Adding...' : 'Adding...'}
                </>
              ) : (
                existingTagMatch ? 
                  (tagAction === 'update' ? 'Update & Add Tag' : 'Use Existing Tag') :
                  'Add Tag'
              )}
            </button>
          </div>

          {isLoadingTags && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading tags...</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
} 