import RecipeEditor from '@/components/RecipeEditor';

export default async function EditRecipePage({ params }) {
  const { id } = await params;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-navy">Edit Recipe</h1>
      <RecipeEditor recipeId={id} />
    </div>
  );
}
